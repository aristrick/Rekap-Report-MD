-- =====================================================================
-- MIGRASI: tambahan kolom untuk upload laporan langsung lewat web
-- (sebagai pelengkap upload via Telegram)
-- Jalankan ini SEKALI SAJA di project Supabase yang SUDAH pernah
-- menjalankan schema.sql sebelumnya. Kalau kamu baru setup project
-- dari nol, TIDAK PERLU jalankan file ini — schema.sql yang terbaru
-- sudah termasuk kolom ini.
-- =====================================================================

alter table report_submissions
  add column if not exists file_url text;

alter table report_submissions
  add column if not exists file_name text;
