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

-- =====================================================================
-- SELESAI. Setelah ini jalankan lagi storage.sql kalau belum pernah
-- (aman dijalankan ulang, memakai "on conflict do nothing").
-- =====================================================================
