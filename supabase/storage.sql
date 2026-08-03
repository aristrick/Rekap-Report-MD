-- =====================================================================
-- STORAGE BUCKETS
-- Jalankan setelah schema.sql
-- Dipakai untuk file yang BUKAN disimpan di Telegram:
--   - surat program (PDF)
--   - excel bukti realisasi
--   - scan tanda terima (PDF)
--   - foto aktivitas
-- Laporan bulanan biasa TETAP disimpan via Telegram (sesuai desain awal),
-- bucket ini khusus untuk modul "Program".
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('program-files', 'program-files', true)
on conflict (id) do nothing;

-- Semua user yang login boleh upload
create policy "program_files_insert"
on storage.objects for insert
with check (bucket_id = 'program-files' and auth.role() = 'authenticated');

-- Semua user yang login boleh lihat (karena bucket public, sebenarnya bisa
-- diakses lewat public URL juga, tapi policy ini tetap dibutuhkan untuk
-- listing lewat client Supabase)
create policy "program_files_select"
on storage.objects for select
using (bucket_id = 'program-files');

-- Hanya pemilik file (uploader) atau mdm/rmdm yang boleh hapus
create policy "program_files_delete"
on storage.objects for delete
using (
  bucket_id = 'program-files'
  and (owner = auth.uid() or auth_role() in ('mdm', 'rmdm'))
);
