-- =====================================================================
-- MIGRASI: Update untuk redesign Sidebar, Kelola RMDM/MDS, dan upload
-- laporan langsung lewat web.
-- Jalankan ini di SQL Editor kalau project Supabase kamu SUDAH pernah
-- menjalankan schema.sql sebelumnya (database sudah ada datanya).
-- Kalau ini instalasi baru dari nol, tidak perlu jalankan file ini --
-- schema.sql yang terbaru sudah termasuk semua perubahan ini.
-- =====================================================================

-- 1. Kolom email di profiles, untuk menampilkan email di halaman Kelola RMDM/MDS
--    tanpa perlu query terpisah ke service role.
alter table profiles add column if not exists email text;

-- Isi email untuk user yang sudah ada, ambil dari auth.users
update profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- 2. Kolom untuk upload laporan langsung lewat web (selain lewat Telegram)
alter table report_submissions add column if not exists file_url text;
alter table report_submissions add column if not exists file_name text;

-- 3. Kolom untuk MDS menugaskan laporan ke Admin/TL tertentu di wilayahnya
alter table report_submissions add column if not exists assigned_to uuid references profiles(id);

-- 4. Policy DELETE yang sebelumnya belum ada, dibutuhkan untuk fitur hapus
--    laporan/program (aman dijalankan ulang, akan skip kalau sudah ada)
do $$ begin
  create policy "report_templates_delete" on report_templates for delete
    using (
      auth_role() = 'mdm'
      or (auth_role() = 'rmdm' and region_id = auth_region_id())
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "programs_delete" on programs for delete
    using (
      auth_role() = 'mdm'
      or (auth_role() = 'rmdm' and region_id = auth_region_id())
    );
exception when duplicate_object then null; end $$;

-- =====================================================================
-- SELESAI. Setelah ini jalankan lagi storage.sql kalau belum pernah
-- (aman dijalankan ulang, memakai "on conflict do nothing").
--
-- PENTING: Kalau setelah menjalankan migrasi ini masih muncul error
-- "Could not find the 'xxx' column of 'profiles' in the schema cache",
-- itu artinya PostgREST (API Supabase) belum me-refresh cache skema-nya.
-- Jalankan baris di bawah ini untuk memaksa refresh:
notify pgrst, 'reload schema';
-- =====================================================================
