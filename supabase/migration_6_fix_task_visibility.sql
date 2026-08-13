-- =====================================================================
-- MIGRASI 6: PERBAIKAN BUG PENTING -- sebelumnya MDS bisa melihat tugas
-- MDS lain di region yang sama (harusnya cuma tugas dia sendiri), dan
-- Admin/TL bisa melihat/mengubah tugas milik MDS-nya. Penyebabnya: baris
-- report_submissions untuk tingkat RMDM & MDS tidak pernah diisi kolom
-- assigned_to, jadi RLS terpaksa mencocokkan lewat region_id/territory_id
-- yang ternyata sama untuk semua orang di region/wilayah itu.
-- =====================================================================

-- 1. Isi assigned_to untuk baris lama yang belum punya (tingkat region/RMDM)
update report_submissions rs
set assigned_to = rmdm.id
from profiles rmdm
where rs.region_id is not null
  and rs.assigned_to is null
  and rmdm.region_id = rs.region_id
  and rmdm.role = 'rmdm';

-- 2. Isi assigned_to untuk baris lama yang belum punya (tingkat wilayah/MDS)
update report_submissions rs
set assigned_to = mds.id
from profiles mds
where rs.territory_id is not null
  and rs.assigned_to is null
  and mds.territory_id = rs.territory_id
  and mds.role = 'mds';

-- 3. Perbaiki fungsi generator supaya SELALU isi assigned_to untuk baris baru
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

-- 4. Perbaiki RLS: oversight lewat region_id/territory_id HANYA untuk RMDM,
--    orang lain (termasuk MDS & Admin/TL) hanya bisa lihat lewat assigned_to
--    atau kalau mereka pembuat tugasnya.
drop policy if exists "report_submissions_select" on report_submissions;
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

drop policy if exists "report_submissions_update" on report_submissions;
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

notify pgrst, 'reload schema';
-- =====================================================================
