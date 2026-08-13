-- =====================================================================
-- MIGRASI 4: Sistem penugasan berjenjang (MDM->RMDM->MDS->Admin/TL)
-- untuk Laporan Bulanan, dan kolom tambahan untuk Program.
-- Jalankan setelah migration_3_master_wilayah.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Enum baru untuk level target laporan
-- ---------------------------------------------------------------------
do $$ begin
  create type report_target_level as enum ('region', 'territory', 'person');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- 2. Restrukturisasi report_templates
-- ---------------------------------------------------------------------
alter table report_templates add column if not exists target_level report_target_level;
alter table report_templates add column if not exists target_all boolean not null default false;

-- Data laporan yang sudah ada dianggap tingkat "territory" (perilaku lama:
-- dibuat MDM/RMDM langsung ke semua wilayah di satu region)
update report_templates set target_level = 'territory', target_all = true where target_level is null;
alter table report_templates alter column target_level set not null;

-- region_id sekarang boleh kosong (dipakai sebagai kolom konteks, bukan wajib)
alter table report_templates alter column region_id drop not null;

-- ---------------------------------------------------------------------
-- 3. Tabel baru: target spesifik (kalau target_all = false)
-- ---------------------------------------------------------------------
create table if not exists report_template_targets (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references report_templates(id) on delete cascade,
  region_id uuid references regions(id) on delete cascade,
  territory_id uuid references territories(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade
);
alter table report_template_targets enable row level security;

do $$ begin
  create policy "report_template_targets_select" on report_template_targets for select
    using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "report_template_targets_write" on report_template_targets for insert
    with check (
      exists (select 1 from report_templates rt where rt.id = template_id and rt.created_by = auth.uid())
    );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 4. Restrukturisasi report_submissions: territory_id sekarang boleh
--    kosong (dulu wajib), tambah region_id dan reviewer_note
-- ---------------------------------------------------------------------
alter table report_submissions alter column territory_id drop not null;
alter table report_submissions add column if not exists region_id uuid references regions(id);
alter table report_submissions add column if not exists reviewer_note text;

-- Ganti unique constraint lama jadi 3 partial unique index sesuai jenis penerima
alter table report_submissions drop constraint if exists report_submissions_template_id_territory_id_key;

create unique index if not exists uidx_submissions_region
  on report_submissions(template_id, region_id) where region_id is not null;
create unique index if not exists uidx_submissions_territory
  on report_submissions(template_id, territory_id) where territory_id is not null;
create unique index if not exists uidx_submissions_person
  on report_submissions(template_id, assigned_to)
  where region_id is null and territory_id is null and assigned_to is not null;

create index if not exists idx_submissions_region on report_submissions(region_id);
create index if not exists idx_submissions_assigned_to on report_submissions(assigned_to);

-- ---------------------------------------------------------------------
-- 5. Hapus trigger otomatis lama, ganti fungsi RPC yang dipanggil manual
--    dari aplikasi (perlu karena target spesifik baru ada setelah
--    template + report_template_targets selesai disimpan)
-- ---------------------------------------------------------------------
drop trigger if exists trg_generate_report_submissions on report_templates;
drop function if exists fn_generate_report_submissions();

create or replace function generate_report_submissions(p_template_id uuid)
returns void
language plpgsql security definer
as $$
declare
  tpl report_templates%rowtype;
  creator profiles%rowtype;
begin
  select * into tpl from report_templates where id = p_template_id;
  select * into creator from profiles where id = tpl.created_by;

  if tpl.target_level = 'region' then
    if tpl.target_all then
      insert into report_submissions (template_id, region_id, status)
      select p_template_id, r.id, 'pending' from regions r
      on conflict do nothing;
    else
      insert into report_submissions (template_id, region_id, status)
      select p_template_id, tt.region_id, 'pending'
      from report_template_targets tt
      where tt.template_id = p_template_id and tt.region_id is not null
      on conflict do nothing;
    end if;

  elsif tpl.target_level = 'territory' then
    if tpl.target_all then
      insert into report_submissions (template_id, territory_id, status)
      select p_template_id, ter.id, 'pending'
      from territories ter
      where ter.region_id = creator.region_id
      on conflict do nothing;
    else
      insert into report_submissions (template_id, territory_id, status)
      select p_template_id, tt.territory_id, 'pending'
      from report_template_targets tt
      where tt.template_id = p_template_id and tt.territory_id is not null
      on conflict do nothing;
    end if;

  elsif tpl.target_level = 'person' then
    if tpl.target_all then
      insert into report_submissions (template_id, assigned_to, status)
      select p_template_id, p.id, 'pending'
      from profiles p
      where p.supervisor_id = tpl.created_by
      on conflict do nothing;
    else
      insert into report_submissions (template_id, assigned_to, status)
      select p_template_id, tt.profile_id, 'pending'
      from report_template_targets tt
      where tt.template_id = p_template_id and tt.profile_id is not null
      on conflict do nothing;
    end if;
  end if;
end;
$$;

grant execute on function generate_report_submissions(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 6. Update RLS report_templates & report_submissions
-- ---------------------------------------------------------------------
drop policy if exists "report_templates_select" on report_templates;
create policy "report_templates_select" on report_templates for select
  using (auth.role() = 'authenticated');

drop policy if exists "report_templates_write" on report_templates;
create policy "report_templates_write" on report_templates for insert
  with check (
    (auth_role() = 'mdm' and target_level = 'region')
    or (auth_role() = 'rmdm' and target_level = 'territory')
    or (auth_role() = 'mds' and target_level = 'person')
  );

drop policy if exists "report_templates_update" on report_templates;
create policy "report_templates_update" on report_templates for update
  using (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and created_by = auth.uid())
    or (auth_role() = 'mds' and created_by = auth.uid())
  );

drop policy if exists "report_templates_delete" on report_templates;
create policy "report_templates_delete" on report_templates for delete
  using (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and created_by = auth.uid())
    or (auth_role() = 'mds' and created_by = auth.uid())
  );

drop policy if exists "report_submissions_select" on report_submissions;
create policy "report_submissions_select" on report_submissions for select
  using (
    auth_role() = 'mdm'
    or region_id = auth_region_id()
    or territory_id = auth_territory_id()
    or (
      territory_id is not null
      and exists (select 1 from territories t where t.id = report_submissions.territory_id and t.region_id = auth_region_id())
    )
    or assigned_to = auth.uid()
  );

drop policy if exists "report_submissions_update" on report_submissions;
create policy "report_submissions_update" on report_submissions for update
  using (
    auth_role() in ('mdm', 'rmdm')
    or territory_id = auth_territory_id()
    or assigned_to = auth.uid()
  );

drop policy if exists "report_submissions_insert" on report_submissions;
create policy "report_submissions_insert" on report_submissions for insert
  with check (auth_role() in ('mdm', 'rmdm', 'mds'));

-- ---------------------------------------------------------------------
-- 7. Program: nomor program, rentang tanggal, dan dukungan "semua region"
-- ---------------------------------------------------------------------
alter table programs add column if not exists program_number text;
alter table programs add column if not exists end_month int check (end_month between 1 and 12);
alter table programs add column if not exists end_year int;
alter table programs add column if not exists territory_all boolean not null default false;
alter table programs alter column region_id drop not null;

drop policy if exists "programs_select" on programs;
create policy "programs_select" on programs for select
  using (
    auth_role() = 'mdm'
    or region_id is null
    or region_id = auth_region_id()
    or exists (
      select 1 from program_territories pt
      where pt.program_id = programs.id and pt.territory_id = auth_territory_id()
    )
  );

drop policy if exists "programs_update" on programs;
create policy "programs_update" on programs for update
  using (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and created_by = auth.uid())
  );

drop policy if exists "programs_delete" on programs;
create policy "programs_delete" on programs for delete
  using (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and created_by = auth.uid())
  );

notify pgrst, 'reload schema';
-- =====================================================================
