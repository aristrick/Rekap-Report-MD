-- =====================================================================
-- MIGRASI 3: Wilayah jadi master data tersendiri (kode cabang, nama,
-- alamat) yang bisa dibuat lepas dari region, lalu di-assign ke region
-- oleh MDM. Jalankan ini kalau project Supabase kamu SUDAH pernah
-- menjalankan schema.sql & migration_2_redesign.sql sebelumnya.
-- =====================================================================

-- 1. region_id di territories jadi boleh kosong (wilayah bisa dibuat dulu
--    sebelum ditugaskan ke region manapun)
alter table territories alter column region_id drop not null;

-- 2. Tambah kolom alamat
alter table territories add column if not exists address text;

-- 3. Ganti aturan unique: dulu (region_id, code), sekarang code sendiri
--    harus unik secara keseluruhan (karena sekarang jadi master data)
alter table territories drop constraint if exists territories_region_id_code_key;
alter table territories add constraint territories_code_key unique (code);

-- 4. Update RLS: pengelolaan wilayah (tambah/edit/hapus) sekarang khusus MDM
drop policy if exists "territories_write" on territories;
create policy "territories_write" on territories for all
  using (auth_role() = 'mdm')
  with check (auth_role() = 'mdm');

drop policy if exists "territories_select" on territories;
create policy "territories_select" on territories for select
  using (
    auth_role() = 'mdm'
    or region_id = auth_region_id()
    or id = auth_territory_id()
  );

notify pgrst, 'reload schema';
-- =====================================================================
