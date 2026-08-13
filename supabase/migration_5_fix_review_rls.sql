-- =====================================================================
-- MIGRASI 5: Perbaikan bug RLS -- pembuat laporan (termasuk MDS yang
-- menugaskan ke Admin/TL-nya sendiri) sebelumnya TIDAK BISA melihat atau
-- me-review baris report_submissions yang mereka buat sendiri untuk
-- tingkat "person" (Admin/TL). Jalankan setelah migration_4.
-- =====================================================================

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
    or exists (select 1 from report_templates rt where rt.id = report_submissions.template_id and rt.created_by = auth.uid())
  );

drop policy if exists "report_submissions_update" on report_submissions;
create policy "report_submissions_update" on report_submissions for update
  using (
    auth_role() in ('mdm', 'rmdm')
    or territory_id = auth_territory_id()
    or assigned_to = auth.uid()
    or exists (select 1 from report_templates rt where rt.id = report_submissions.template_id and rt.created_by = auth.uid())
  );

notify pgrst, 'reload schema';
-- =====================================================================
