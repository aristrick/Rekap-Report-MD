-- =====================================================================
-- SKEMA DATABASE: Aplikasi Laporan Bulanan & Program MDM/RMDM/MDS
-- Jalankan file ini di Supabase Dashboard > SQL Editor > New Query
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSION
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. ENUM ROLE
-- role_level menentukan hierarki:
--   mdm    -> Manager Nasional (super user, lihat semua wilayah)
--   rmdm   -> Region Manager (admin per region, punya banyak wilayah)
--   mds    -> pemegang 1 wilayah
--   admin  -> staf di bawah MDS (input data)
--   tl     -> Team Leader di bawah MDS (input data + approve internal)
-- ---------------------------------------------------------------------
do $$ begin
  create type role_level as enum ('mdm', 'rmdm', 'mds', 'admin', 'tl');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type submission_status as enum ('pending', 'submitted', 'late', 'rejected', 'approved');
exception
  when duplicate_object then null;
end $$;

-- report_target_level menentukan siapa yang jadi "penerima tugas" saat laporan dibuat:
--   region    -> dibuat MDM, ditujukan ke RMDM (per region)
--   territory -> dibuat RMDM, ditujukan ke MDS (per wilayah)
--   person    -> dibuat MDS, ditujukan ke Admin/TL tertentu di wilayahnya
do $$ begin
  create type report_target_level as enum ('region', 'territory', 'person');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
-- 2. REGIONS (contoh: RMDM 31, RMDM 32)
-- Satu region dipegang oleh satu RMDM (bisa lebih dari satu user RMDM jika perlu)
-- ---------------------------------------------------------------------
create table if not exists regions (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,          -- contoh: 'RMDM31'
  name text not null,                 -- contoh: 'Region 31 - Jakarta Timur'
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. WILAYAH (di bawah region, dipegang MDS)
-- contoh: Pulogadung, Selatan, Sunter, Depok, Bogor
-- ---------------------------------------------------------------------
create table if not exists territories (
  id uuid primary key default uuid_generate_v4(),
  region_id uuid references regions(id) on delete cascade, -- nullable: cabang bisa dibuat dulu sebelum ditugaskan ke region
  code text not null,                 -- contoh: 'BOGOR'
  name text not null,                 -- contoh: 'Bogor'
  address text,                       -- alamat cabang, untuk referensi RMDM/MDS
  created_at timestamptz not null default now(),
  unique (code)
);

-- ---------------------------------------------------------------------
-- 4. PROFILES
-- 1 baris = 1 user login (terhubung ke auth.users bawaan Supabase Auth)
-- - mdm       : region_id & territory_id NULL (lihat semua)
-- - rmdm      : region_id terisi, territory_id NULL (lihat semua wilayah di regionnya)
-- - mds/admin/tl : region_id & territory_id terisi (lihat 1 wilayah saja)
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  role role_level not null,
  region_id uuid references regions(id) on delete set null,
  territory_id uuid references territories(id) on delete set null,
  supervisor_id uuid references profiles(id) on delete set null, -- admin/tl -> id MDS-nya
  telegram_user_id text unique,        -- user id Telegram, untuk mengenali siapa yang kirim file di group
  telegram_chat_id text,               -- opsional: chat id personal (DM) untuk pengingat pribadi
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_region on profiles(region_id);
create index if not exists idx_profiles_territory on profiles(territory_id);

-- ---------------------------------------------------------------------
-- 5. TELEGRAM GROUPS
-- Group telegram dipakai sebagai "storage" file + tempat notifikasi.
-- Bisa didaftarkan per region atau per wilayah.
-- ---------------------------------------------------------------------
create table if not exists telegram_groups (
  id uuid primary key default uuid_generate_v4(),
  chat_id text not null unique,        -- id group telegram, contoh: -1001234567890
  label text not null,                 -- nama bebas, contoh: 'Group RMDM31'
  region_id uuid references regions(id) on delete cascade,
  territory_id uuid references territories(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. REPORT TEMPLATES ("nama laporan bulanan")
-- Hanya RMDM/MDM yang boleh membuat nama & periode laporan.
-- Setiap template otomatis "generate" 1 tugas submit ke tiap wilayah di regionnya
-- (lihat tabel report_submissions).
-- ---------------------------------------------------------------------
create table if not exists report_templates (
  id uuid primary key default uuid_generate_v4(),
  name text not null,                  -- contoh: 'Laporan Kunjungan Toko - Agustus 2026'
  description text,
  target_level report_target_level not null, -- region (MDM->RMDM) / territory (RMDM->MDS) / person (MDS->Admin/TL)
  target_all boolean not null default false,  -- true = "semua", false = pilih target tertentu (lihat report_template_targets)
  region_id uuid references regions(id) on delete cascade, -- konteks region: diisi untuk template tingkat territory/person, kosong untuk tingkat region
  period_month int not null check (period_month between 1 and 12),
  period_year int not null,
  deadline timestamptz not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- Target spesifik saat target_all = false. Salah satu kolom saja yang diisi
-- tergantung target_level template-nya (region_id / territory_id / profile_id).
create table if not exists report_template_targets (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references report_templates(id) on delete cascade,
  region_id uuid references regions(id) on delete cascade,
  territory_id uuid references territories(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade
);

-- ---------------------------------------------------------------------
-- 7. REPORT SUBMISSIONS
-- 1 baris per "penerima tugas" per template -- penerimanya bisa berupa
-- region (RMDM), wilayah (MDS), atau orang tertentu (Admin/TL), tergantung
-- target_level template induknya. Persis satu dari (region_id, territory_id,
-- assigned_to) yang terisi untuk menandai siapa penerimanya.
-- File laporan bisa disimpan di Telegram (file_id) ATAU diupload langsung
-- lewat web (file_url) -- dua-duanya opsional, salah satu cukup.
-- ---------------------------------------------------------------------
create table if not exists report_submissions (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid not null references report_templates(id) on delete cascade,
  region_id uuid references regions(id), -- diisi kalau penerima tugas ini RMDM (region-tier)
  territory_id uuid references territories(id) on delete cascade,
  status submission_status not null default 'pending',
  submitted_by uuid references profiles(id),
  submitted_at timestamptz,
  assigned_to uuid references profiles(id), -- penerima person-tier, ATAU delegasi manual dari MDS ke Admin/TL
  telegram_file_id text,               -- file_id dari Telegram (dokumen/foto)
  telegram_message_id text,            -- id pesan di group, untuk audit/link
  file_url text,                       -- url file kalau diupload langsung lewat web
  file_name text,                      -- nama asli file yang diupload lewat web
  note text,                           -- catatan/pesan dari pengirim ke atasan
  reviewer_note text,                  -- catatan revisi dari atasan (kalau status 'rejected')
  created_at timestamptz not null default now()
);

create index if not exists idx_submissions_template on report_submissions(template_id);
create index if not exists idx_submissions_territory on report_submissions(territory_id);
create index if not exists idx_submissions_region on report_submissions(region_id);
create index if not exists idx_submissions_assigned_to on report_submissions(assigned_to);

-- Cegah duplikat baris untuk penerima yang sama dalam 1 template, per jenis penerima
create unique index if not exists uidx_submissions_region
  on report_submissions(template_id, region_id) where region_id is not null;
create unique index if not exists uidx_submissions_territory
  on report_submissions(template_id, territory_id) where territory_id is not null;
create unique index if not exists uidx_submissions_person
  on report_submissions(template_id, assigned_to)
  where region_id is null and territory_id is null and assigned_to is not null;

-- ---------------------------------------------------------------------
-- 8. PROGRAMS
-- Dibuat oleh RMDM/MDM, berlaku untuk wilayah tertentu & periode tertentu.
-- ---------------------------------------------------------------------
create table if not exists programs (
  id uuid primary key default uuid_generate_v4(),
  program_number text,                 -- nomor surat/program, contoh: '091/RBM 2/FB-Pst/II/2025'
  name text not null,                  -- nama program
  description text,
  region_id uuid references regions(id) on delete cascade, -- kosong = berlaku untuk semua region
  letter_file_url text,                -- surat program (PDF), disimpan di Supabase Storage
  period_month int not null check (period_month between 1 and 12),   -- bulan mulai
  period_year int not null,                                          -- tahun mulai
  end_month int check (end_month between 1 and 12),                  -- bulan berakhir (opsional)
  end_year int,                                                      -- tahun berakhir (opsional)
  territory_all boolean not null default false, -- true = berlaku semua wilayah di region terkait
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- program berlaku untuk banyak wilayah -> tabel relasi
create table if not exists program_territories (
  program_id uuid not null references programs(id) on delete cascade,
  territory_id uuid not null references territories(id) on delete cascade,
  primary key (program_id, territory_id)
);

-- ---------------------------------------------------------------------
-- 9. PROGRAM REALIZATIONS
-- Diisi oleh MDS: upload excel/pdf tanda terima + foto aktivitas.
-- File disimpan di Supabase Storage (bucket 'program-files') karena
-- berupa bukti resmi yang perlu query & preview yang stabil.
-- ---------------------------------------------------------------------
create table if not exists program_realizations (
  id uuid primary key default uuid_generate_v4(),
  program_id uuid not null references programs(id) on delete cascade,
  territory_id uuid not null references territories(id) on delete cascade,
  status submission_status not null default 'pending',
  excel_file_url text,
  receipt_pdf_url text,                -- scan tanda terima toko
  activity_photo_urls text[],          -- array url foto aktivitas
  submitted_by uuid references profiles(id),
  submitted_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  unique (program_id, territory_id)
);

create index if not exists idx_realizations_program on program_realizations(program_id);
create index if not exists idx_realizations_territory on program_realizations(territory_id);

-- ---------------------------------------------------------------------
-- 10. ACTIVITY LOG (opsional tapi berguna untuk audit & notifikasi bot)
-- ---------------------------------------------------------------------
create table if not exists activity_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references profiles(id),
  action text not null,                -- contoh: 'submit_report', 'create_program'
  entity_type text not null,
  entity_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 11. HELPER FUNCTIONS untuk RLS (menghindari infinite recursion)
-- =====================================================================
create or replace function auth_role()
returns role_level
language sql stable security definer
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_region_id()
returns uuid
language sql stable security definer
as $$
  select region_id from profiles where id = auth.uid();
$$;

create or replace function auth_territory_id()
returns uuid
language sql stable security definer
as $$
  select territory_id from profiles where id = auth.uid();
$$;

-- =====================================================================
-- 12. ROW LEVEL SECURITY
-- =====================================================================
alter table regions enable row level security;
alter table territories enable row level security;
alter table profiles enable row level security;
alter table telegram_groups enable row level security;
alter table report_templates enable row level security;
alter table report_submissions enable row level security;
alter table programs enable row level security;
alter table program_territories enable row level security;
alter table program_realizations enable row level security;
alter table activity_logs enable row level security;

-- --- REGIONS: semua user login boleh baca; hanya mdm yang boleh insert/update/delete
create policy "regions_select_all" on regions for select
  using (auth.role() = 'authenticated');

create policy "regions_write_mdm" on regions for all
  using (auth_role() = 'mdm')
  with check (auth_role() = 'mdm');

-- --- TERRITORIES: mdm kelola master data (semua operasi); rmdm/mds/admin/tl hanya lihat sesuai scope
create policy "territories_select" on territories for select
  using (
    auth_role() = 'mdm'
    or region_id = auth_region_id()
    or id = auth_territory_id()
  );

create policy "territories_write" on territories for all
  using (auth_role() = 'mdm')
  with check (auth_role() = 'mdm');

-- --- PROFILES: user bisa lihat dirinya sendiri; mdm lihat semua;
--     rmdm lihat semua profile di regionnya; mds lihat admin/tl di wilayahnya
create policy "profiles_select" on profiles for select
  using (
    id = auth.uid()
    or auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and region_id = auth_region_id())
    or (auth_role() = 'mds' and territory_id = auth_territory_id())
  );

create policy "profiles_update_self" on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_write_admin" on profiles for insert
  with check (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and region_id = auth_region_id())
    or (auth_role() = 'mds' and territory_id = auth_territory_id())
  );

create policy "profiles_update_admin" on profiles for update
  using (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and region_id = auth_region_id())
    or (auth_role() = 'mds' and territory_id = auth_territory_id())
  );

-- --- TELEGRAM GROUPS: sesuai scope region/wilayah
create policy "telegram_groups_select" on telegram_groups for select
  using (
    auth_role() = 'mdm'
    or region_id = auth_region_id()
    or territory_id = auth_territory_id()
  );

create policy "telegram_groups_write" on telegram_groups for all
  using (auth_role() in ('mdm', 'rmdm'))
  with check (auth_role() in ('mdm', 'rmdm'));

-- --- REPORT TEMPLATES: mdm bikin tingkat region; rmdm bikin tingkat territory
--     (regionnya sendiri); mds bikin tingkat person (untuk Admin/TL-nya).
--     Select dibuka untuk semua yang login -- detail sensitif ada di report_submissions.
create policy "report_templates_select" on report_templates for select
  using (auth.role() = 'authenticated');

create policy "report_templates_write" on report_templates for insert
  with check (
    (auth_role() = 'mdm' and target_level = 'region')
    or (auth_role() = 'rmdm' and target_level = 'territory')
    or (auth_role() = 'mds' and target_level = 'person')
  );

create policy "report_templates_update" on report_templates for update
  using (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and created_by = auth.uid())
    or (auth_role() = 'mds' and created_by = auth.uid())
  );

create policy "report_templates_delete" on report_templates for delete
  using (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and created_by = auth.uid())
    or (auth_role() = 'mds' and created_by = auth.uid())
  );

-- --- REPORT TEMPLATE TARGETS: dibuat bersamaan dengan template-nya oleh pembuat yang sama
create policy "report_template_targets_select" on report_template_targets for select
  using (auth.role() = 'authenticated');

create policy "report_template_targets_write" on report_template_targets for insert
  with check (
    exists (select 1 from report_templates rt where rt.id = template_id and rt.created_by = auth.uid())
  );

-- --- REPORT SUBMISSIONS: lihat/update sesuai posisi -- MDM semua, RMDM
--     region-nya (baik baris untuk dirinya sendiri maupun untuk MDS di
--     bawahnya), MDS/Admin/TL wilayahnya sendiri atau yang ditugaskan
--     langsung ke mereka (assigned_to).
create policy "report_submissions_select" on report_submissions for select
  using (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and region_id = auth_region_id())
    or (
      auth_role() = 'rmdm' and territory_id is not null
      and exists (select 1 from territories t where t.id = report_submissions.territory_id and t.region_id = auth_region_id())
    )
    or assigned_to = auth.uid()
    or exists (select 1 from report_templates rt where rt.id = report_submissions.template_id and rt.created_by = auth.uid())
  );

create policy "report_submissions_update" on report_submissions for update
  using (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and region_id = auth_region_id())
    or (
      auth_role() = 'rmdm' and territory_id is not null
      and exists (select 1 from territories t where t.id = report_submissions.territory_id and t.region_id = auth_region_id())
    )
    or assigned_to = auth.uid()
    or exists (select 1 from report_templates rt where rt.id = report_submissions.template_id and rt.created_by = auth.uid())
  );

create policy "report_submissions_insert" on report_submissions for insert
  with check (auth_role() in ('mdm', 'rmdm', 'mds'));

-- --- PROGRAMS: dibuat rmdm/mdm; region_id kosong = berlaku semua region (khusus MDM)
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

create policy "programs_write" on programs for insert
  with check (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and region_id = auth_region_id())
  );

create policy "programs_update" on programs for update
  using (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and created_by = auth.uid())
  );

create policy "programs_delete" on programs for delete
  using (
    auth_role() = 'mdm'
    or (auth_role() = 'rmdm' and created_by = auth.uid())
  );

-- --- PROGRAM TERRITORIES
create policy "program_territories_select" on program_territories for select
  using (auth.role() = 'authenticated');

create policy "program_territories_write" on program_territories for all
  using (auth_role() in ('mdm', 'rmdm'))
  with check (auth_role() in ('mdm', 'rmdm'));

-- --- PROGRAM REALIZATIONS: mirip report_submissions
create policy "program_realizations_select" on program_realizations for select
  using (
    auth_role() = 'mdm'
    or exists (
      select 1 from territories t
      where t.id = program_realizations.territory_id
      and (t.region_id = auth_region_id() or t.id = auth_territory_id())
    )
  );

create policy "program_realizations_update" on program_realizations for update
  using (
    auth_role() in ('mdm', 'rmdm')
    or territory_id = auth_territory_id()
  );

create policy "program_realizations_insert" on program_realizations for insert
  with check (auth_role() in ('mdm', 'rmdm'));

-- --- ACTIVITY LOGS: semua yang login boleh insert (audit), baca sesuai scope
create policy "activity_logs_insert" on activity_logs for insert
  with check (auth.role() = 'authenticated');

create policy "activity_logs_select" on activity_logs for select
  using (auth_role() = 'mdm' or actor_id = auth.uid());

-- =====================================================================
-- 13. FUNGSI: generate baris report_submissions untuk template laporan
-- Dipanggil dari aplikasi (bukan trigger otomatis) SETELAH template dan
-- baris report_template_targets (kalau target_all = false) selesai dibuat.
-- Ini karena target spesifik baru ada setelah template-nya tersimpan,
-- jadi tidak bisa pakai trigger AFTER INSERT biasa.
-- =====================================================================
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
      insert into report_submissions (template_id, region_id, assigned_to, status)
      select p_template_id, r.id, rmdm.id, 'pending'
      from regions r
      join profiles rmdm on rmdm.region_id = r.id and rmdm.role = 'rmdm'
      on conflict do nothing;
    else
      insert into report_submissions (template_id, region_id, assigned_to, status)
      select p_template_id, tt.region_id, rmdm.id, 'pending'
      from report_template_targets tt
      join profiles rmdm on rmdm.region_id = tt.region_id and rmdm.role = 'rmdm'
      where tt.template_id = p_template_id and tt.region_id is not null
      on conflict do nothing;
    end if;

  elsif tpl.target_level = 'territory' then
    if tpl.target_all then
      insert into report_submissions (template_id, territory_id, assigned_to, status)
      select p_template_id, ter.id, mds.id, 'pending'
      from territories ter
      join profiles mds on mds.territory_id = ter.id and mds.role = 'mds'
      where ter.region_id = creator.region_id
      on conflict do nothing;
    else
      insert into report_submissions (template_id, territory_id, assigned_to, status)
      select p_template_id, tt.territory_id, mds.id, 'pending'
      from report_template_targets tt
      join profiles mds on mds.territory_id = tt.territory_id and mds.role = 'mds'
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

create or replace function fn_generate_program_realizations()
returns trigger
language plpgsql security definer
as $$
begin
  insert into program_realizations (program_id, territory_id, status)
  select new.program_id, new.territory_id, 'pending'
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_generate_program_realizations on program_territories;
create trigger trg_generate_program_realizations
  after insert on program_territories
  for each row execute function fn_generate_program_realizations();

-- =====================================================================
-- SELESAI. Lanjut ke storage.sql untuk membuat bucket file.
-- =====================================================================
