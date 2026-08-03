-- =====================================================================
-- CONTOH DATA (OPSIONAL) — jalankan setelah schema.sql & storage.sql
-- kalau ingin langsung punya data contoh untuk dicoba.
-- Jangan jalankan di database produksi yang sudah ada datanya.
-- =====================================================================

insert into regions (code, name) values
  ('RMDM31', 'Region 31 - Jakarta Timur & Sekitarnya'),
  ('RMDM32', 'Region 32 - Jakarta Selatan & Sekitarnya')
on conflict (code) do nothing;

insert into territories (region_id, code, name)
select id, 'PULOGADUNG', 'Pulogadung' from regions where code = 'RMDM31'
union all
select id, 'SUNTER', 'Sunter' from regions where code = 'RMDM31'
union all
select id, 'DEPOK', 'Depok' from regions where code = 'RMDM31'
union all
select id, 'BOGOR', 'Bogor' from regions where code = 'RMDM31'
union all
select id, 'SELATAN', 'Jakarta Selatan' from regions where code = 'RMDM32'
on conflict (region_id, code) do nothing;

-- Catatan: baris di atas hanya membuat region & wilayah.
-- Akun user (profiles) TIDAK dibuat lewat SQL karena harus terhubung ke
-- auth.users (hasil signup/invite). Buat akun MDM pertama lewat langkah
-- di README bagian "5. Membuat Akun MDM Pertama (Super User)".
