# Rekap Report MD — Web Pelacakan Laporan Bulanan & Program

Web internal untuk memantau kiriman laporan bulanan dan realisasi program tim lapangan,
dengan struktur role **MDM → RMDM → MDS → Admin/TL**, terhubung ke **Telegram Bot** untuk
pengiriman file dan pengingat otomatis.

Dibangun dengan **Next.js 14 (App Router)**, **Supabase** (Database + Auth + Storage), dan
di-deploy ke **Vercel**.

---

## 0. Sebelum Mulai — Yang Perlu Kamu Siapkan

- Akun [Supabase](https://supabase.com) (gratis)
- Akun [Vercel](https://vercel.com) (gratis)
- Akun [GitHub](https://github.com)
- Aplikasi Telegram + akses ke group yang mau dipakai
- Komputer dengan [Node.js](https://nodejs.org) versi 18 ke atas terpasang (untuk coba di lokal, opsional — bisa juga langsung deploy tanpa coba lokal)

---

## 1. Upload Kode ke GitHub

1. Buka [github.com/new](https://github.com/new), buat repository baru, misalnya nama `rekap-report-md`. Set ke **Private** (karena ini aplikasi internal).
2. Extract file `.zip` yang saya berikan ke folder di komputer kamu.
3. Buka folder tersebut lewat terminal, lalu jalankan:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Rekap Report MD"
   git branch -M main
   git remote add origin https://github.com/USERNAME_KAMU/rekap-report-md.git
   git push -u origin main
   ```
   Ganti `USERNAME_KAMU` dengan username GitHub kamu.

> Kalau tidak familiar dengan terminal/git, kamu juga bisa drag-and-drop semua file ke halaman repository GitHub lewat browser (tombol "Add file" → "Upload files"), tapi cara ini lebih lambat untuk banyak file.

---

## 2. Membuat Project Supabase

1. Buka [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**.
2. Isi nama project (contoh: `rekap-report-md`), buat password database yang kuat (simpan baik-baik), pilih region terdekat (Singapore paling dekat ke Indonesia).
3. Tunggu 1-2 menit sampai project selesai dibuat.
4. Di sidebar kiri, buka **SQL Editor** → **New Query**.
5. Buka file `supabase/schema.sql` dari folder project kamu, **copy semua isinya**, paste ke SQL Editor, lalu klik **Run**. Tunggu sampai selesai (akan muncul "Success. No rows returned").
6. Buat query baru lagi, copy-paste isi `supabase/storage.sql`, klik **Run**.
7. *(Opsional, untuk latihan/testing)* buat query baru, copy-paste isi `supabase/seed.sql`, klik **Run**. Ini akan membuat 2 region dan beberapa wilayah contoh.

### Mengambil kunci API Supabase

1. Di sidebar, buka **Project Settings** (ikon gear) → **API**.
2. Catat 3 nilai berikut, akan dipakai nanti di environment variables:
   - **Project URL** → ini nilai `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → ini nilai `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (klik "Reveal" dulu) → ini nilai `SUPABASE_SERVICE_ROLE_KEY`. **Kunci ini sangat rahasia**, jangan pernah dibagikan atau di-commit ke GitHub.

### Mengaktifkan pengiriman email undangan (untuk fitur "Undang Anggota Baru")

1. Di sidebar, buka **Authentication** → **Providers**, pastikan **Email** aktif.
2. Buka **Authentication** → **URL Configuration**, isi **Site URL** dengan alamat web kamu nanti (contoh: `https://rekap-report-md.vercel.app`). Ini bisa diisi belakangan setelah deploy ke Vercel selesai (langkah 4).

> Supabase gratis membatasi jumlah email undangan per jam. Untuk pemakaian tim kecil (puluhan orang) biasanya cukup. Kalau butuh lebih banyak, di **Project Settings → Auth** kamu bisa hubungkan SMTP sendiri (misalnya Gmail atau provider email kantor).

---

## 3. Membuat Bot Telegram

1. Buka Telegram, cari **@BotFather**, klik **Start**.
2. Ketik `/newbot`, ikuti instruksinya: kasih nama bot (contoh: `Rekap Report MD Bot`) dan username unik (harus diakhiri `bot`, contoh: `rekap_report_md_bot`).
3. BotFather akan memberikan **token**, formatnya seperti `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`. **Simpan token ini** — nilai untuk `TELEGRAM_BOT_TOKEN`.
4. Tambahkan bot ke group Telegram yang mau dipakai (search username bot-nya, invite ke group seperti biasa).
5. **Penting**: Matikan Privacy Mode supaya bot bisa membaca semua pesan di group (bukan cuma yang mention dia):
   - Chat lagi ke @BotFather, ketik `/mybots`, pilih bot kamu.
   - Klik **Bot Settings** → **Group Privacy** → **Turn off**.
   - Kalau bot sudah lebih dulu ada di group sebelum ini di-off, keluarkan dulu botnya dari group lalu invite ulang.

### Membuat 2 string rahasia sendiri

Isi bebas, yang penting panjang dan acak. Kamu bisa generate lewat situs seperti [random.org](https://www.random.org/strings/) atau ketik sendiri campuran huruf-angka minimal 24 karakter:
- `TELEGRAM_WEBHOOK_SECRET` — untuk validasi webhook Telegram
- `CRON_SECRET` — untuk melindungi endpoint reminder

Simpan dulu, dipakai di langkah berikutnya.

---

## 4. Deploy ke Vercel

1. Buka [vercel.com/new](https://vercel.com/new), login pakai akun GitHub kamu.
2. Klik **Import** pada repository `rekap-report-md` yang tadi kamu push.
3. Di halaman konfigurasi sebelum deploy, buka bagian **Environment Variables**, isi semua ini satu per satu (Name di kiri, Value di kanan):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL dari Supabase (langkah 2) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key dari Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key dari Supabase |
   | `TELEGRAM_BOT_TOKEN` | Token dari BotFather (langkah 3) |
   | `TELEGRAM_WEBHOOK_SECRET` | String rahasia buatanmu |
   | `CRON_SECRET` | String rahasia buatanmu (beda dari di atas) |
   | `NEXT_PUBLIC_APP_URL` | Isi sementara `https://placeholder.vercel.app` — akan diperbaiki setelah deploy pertama |

4. Klik **Deploy**. Tunggu 2-3 menit.
5. Setelah selesai, Vercel akan memberi kamu URL, contoh `https://rekap-report-md.vercel.app`. Klik **Visit** untuk memastikan halaman login muncul.

### Perbaiki `NEXT_PUBLIC_APP_URL`

1. Balik ke **Project Settings** (di Vercel) → **Environment Variables**.
2. Edit `NEXT_PUBLIC_APP_URL`, ganti dengan URL asli dari langkah sebelumnya.
3. Buka tab **Deployments**, klik titik tiga (⋯) di deployment paling atas → **Redeploy**, supaya perubahan env variable terpakai.

### Update Site URL di Supabase

Balik ke Supabase → **Authentication** → **URL Configuration**, isi **Site URL** dengan URL Vercel kamu yang asli. Ini penting supaya link undangan email mengarah ke tempat yang benar.

---

## 5. Menghubungkan Webhook Telegram

Setelah web sudah live, daftarkan URL webhook supaya Telegram tahu ke mana harus mengirim pesan.
Buka browser, akses URL berikut (ganti bagian dalam `<>`):

```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<URL_VERCEL_KAMU>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```

Contoh nyata:
```
https://api.telegram.org/bot123456789:AAExxxx/setWebhook?url=https://rekap-report-md.vercel.app/api/telegram/webhook&secret_token=abcXYZ123rahasia
```

Kalau berhasil, browser akan menampilkan `{"ok":true,"result":true,"description":"Webhook was set"}`.

Untuk mengecek status webhook kapan saja:
```
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

---

## 6. Membuat Akun MDM Pertama (Super User)

Karena akun pertama tidak ada yang bisa mengundang (belum ada MDM sama sekali), buat manual sekali saja:

1. Di Supabase Dashboard, buka **Authentication** → **Users** → **Add user** → **Create new user**.
2. Isi email dan password, centang **Auto Confirm User**, klik **Create user**.
3. Copy **User UID** yang muncul di daftar user (klik user tersebut untuk melihat UID lengkap).
4. Buka **SQL Editor**, jalankan query berikut (ganti `PASTE_UID_DISINI` dan `Nama Kamu`):
   ```sql
   insert into profiles (id, full_name, role)
   values ('PASTE_UID_DISINI', 'Nama Kamu', 'mdm');
   ```
5. Sekarang kamu bisa login ke web pakai email & password tadi. Akun ini adalah MDM (Manager Nasional) — bisa melihat semua region dan mengundang RMDM lewat halaman **Kelola User** di web.

---

## 7. Menyusun Struktur Organisasi di Web

Setelah login sebagai MDM:

1. Buka menu **Kelola Wilayah** → tambahkan Region (contoh: `RMDM31`, `RMDM32`) dan Wilayah di bawahnya (contoh: Pulogadung, Sunter, Depok, Bogor).
   *(Lewati langkah ini kalau kamu sudah menjalankan `seed.sql` di langkah 2.)*
2. Buka menu **Kelola User** → undang RMDM (isi email, nama, pilih region). RMDM akan menerima email undangan untuk set password.
3. RMDM yang sudah login bisa mengundang MDS untuk wilayah di bawahnya, dan MDS bisa mengundang Admin/TL di bawahnya — semua lewat halaman **Kelola User** yang sama, otomatis dibatasi sesuai levelnya.

### Cara Mendapatkan Chat ID Group Telegram

1. Tambahkan bot ke group wilayah/region (lihat langkah 3).
2. Kirim pesan apa saja di group tersebut (misalnya ketik "test").
3. Buka browser, akses:
   ```
   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
   ```
4. Cari bagian `"chat":{"id":-1001234567890, ...}` — angka itu (termasuk tanda minus di depan) adalah Chat ID group.
5. Di web, buka **Kelola Wilayah** → bagian **Daftarkan Group Telegram**, isi Chat ID dan pilih wilayah/region yang sesuai.

### Menautkan Akun Telegram Pribadi (WAJIB untuk semua user)

Supaya bot tahu siapa yang mengirim file di group, setiap user (MDS/Admin/TL yang akan mengirim laporan) harus:

1. Chat ke bot **@userinfobot** di Telegram (bot pihak ketiga, gratis, cuma untuk cek ID) — dia akan membalas dengan ID Telegram kamu.
2. Login ke web, buka menu **Profil**, masukkan ID tersebut di kolom **Telegram User ID**, simpan.

---

## 8. Menyalakan Reminder Otomatis (Cron)

File `vercel.json` sudah berisi jadwal cron yang otomatis berjalan **1x sehari (jam 09:00 WIB)** untuk:
- Mengingatkan wilayah yang deadline-nya kurang dari 24 jam lagi.
- Menandai `late` dan mengingatkan wilayah yang sudah lewat deadline.

Vercel Cron otomatis aktif begitu file `vercel.json` ter-deploy — **tidak perlu setup tambahan**, asal kamu deploy lewat Vercel (bukan platform lain). Vercel Hobby (plan gratis) hanya mengizinkan **1x jalan per hari** untuk setiap cron job, jadi konfigurasi ini sudah disesuaikan supaya tidak error. Kalau nanti upgrade ke plan Pro, kamu bisa menambah frekuensinya (misalnya jadi 2x sehari) dengan menambah satu blok lagi di `vercel.json`.

Untuk mengubah jadwal, edit bagian `schedule` di `vercel.json` (format cron standar, dalam **UTC**, jadi WIB = UTC+7). Setelah edit, push ulang ke GitHub — Vercel otomatis re-deploy.

Untuk test manual cron tanpa menunggu jadwal, akses lewat terminal:
```bash
curl -H "Authorization: Bearer NILAI_CRON_SECRET_KAMU" https://<URL_VERCEL_KAMU>/api/cron/reminder
```

---

## 9. Alur Pemakaian Sehari-hari

**RMDM/MDM membuat laporan bulanan baru:**
Menu *Laporan Bulanan* → *Buat Laporan Baru* → isi nama, pilih periode & deadline → Simpan.
Sistem otomatis membuat tugas kirim untuk semua wilayah di region tersebut.

**MDS/Admin/TL mengirim laporan:**
Kirim file (dokumen atau foto) langsung ke group Telegram wilayahnya. Bot otomatis mendeteksi, menandai status "submitted" di web, dan membalas konfirmasi di group.

**RMDM/MDM membuat program:**
Menu *Program* → *Buat Program Baru* → isi nama, upload surat program (PDF), pilih wilayah yang menjalankan, isi periode → Simpan.

**MDS mengunggah bukti realisasi program:**
Buka program terkait di web → *Upload Bukti* → unggah excel, scan tanda terima, dan foto aktivitas.
(Ini beda dari laporan bulanan: bukti realisasi diunggah lewat **web**, bukan Telegram, karena filenya perlu tersimpan rapi & bisa dibuka lewat link permanen.)

---

## 10. Struktur Kode (untuk referensi developer)

```
src/
  app/
    login/                     halaman login
    dashboard/                 ringkasan kepatuhan laporan
    reports/                   daftar, buat, & detail laporan bulanan
    programs/                  daftar, buat, detail, & upload realisasi program
    admin/regions/             kelola region, wilayah, group telegram
    admin/users/               undang & lihat anggota tim
    profile/                   tautkan Telegram User ID pribadi
    api/telegram/webhook/      terima update dari Telegram (submit otomatis)
    api/telegram/notify/       kirim pesan manual ke group
    api/cron/reminder/         dipanggil terjadwal, cek deadline
    api/upload/                upload file ke Supabase Storage
    api/admin/create-user/     undang user baru (pakai service role)
  components/                  Navbar, form-form, dsb.
  lib/
    supabase/                  client Supabase (browser, server, service role)
    auth.ts                    helper cek login & role
    telegram.ts                helper kirim pesan & baca file Telegram
    types.ts                   TypeScript types
supabase/
  schema.sql                   skema database + RLS (WAJIB dijalankan)
  storage.sql                  setup bucket file (WAJIB dijalankan)
  seed.sql                     contoh data (opsional)
```

---

## 11. Coba di Komputer Lokal (Opsional)

Kalau mau coba dulu sebelum deploy:

```bash
npm install
cp .env.example .env.local
# edit .env.local, isi semua value seperti langkah 2 & 3 di atas
npm run dev
```

Buka `http://localhost:3000`. Catatan: webhook Telegram tidak bisa mengarah ke `localhost` (Telegram butuh URL publik), jadi untuk test alur Telegram lengkap tetap perlu deploy ke Vercel dulu.

---

## 12. Saran & Catatan Penting

**Soal menyimpan file laporan di Telegram (bukan cloud storage):**
Ini menghemat biaya, tapi ada beberapa risiko yang perlu kamu sadari:
- File yang dikirim ke Telegram bisa hilang aksesnya kalau pesan dihapus dari group, atau kalau bot di-remove lalu di-invite ulang (link file/`file_id` Telegram bisa berubah/kadaluarsa).
- Telegram tidak menjamin penyimpanan permanen selamanya; ini cocok untuk laporan rutin bulanan yang sifatnya operasional, tapi **kurang cocok** untuk dokumen yang wajib diarsipkan jangka panjang (misalnya untuk audit tahunan).
- Karena itu, modul **Program** sengaja saya desain berbeda — bukti realisasi (excel, tanda terima, foto) disimpan di **Supabase Storage** (bukan Telegram), karena biasanya dokumen ini perlu diakses/diaudit lebih lama dan butuh link yang stabil. Supabase Storage gratis untuk 1GB pertama, cukup besar untuk ratusan dokumen PDF/Excel.
- Kalau nanti kamu berubah pikiran dan ingin laporan bulanan juga diarsipkan permanen, tinggal ubah field `telegram_file_id` di tabel `report_submissions` untuk juga menyalin file ke Supabase Storage saat diterima webhook (fungsi `getTelegramFileUrl` di `src/lib/telegram.ts` sudah saya siapkan untuk keperluan ini).

**Soal keamanan:**
- Jangan bagikan `SUPABASE_SERVICE_ROLE_KEY` ke siapapun — kunci ini bisa bypass semua aturan keamanan database.
- Semua akses data di web sudah dibatasi otomatis lewat Row Level Security (RLS) di database, jadi meskipun ada bug di kode halaman, seorang RMDM tetap tidak akan bisa mengambil data region lain langsung dari database.

**Kalau tim berkembang lebih besar:**
- Supabase versi gratis punya batas 500MB database dan beberapa batas lain (email/jam, dsb). Untuk tim di atas ~50 orang aktif, pertimbangkan upgrade ke plan Supabase Pro ($25/bulan) dan Vercel Pro kalau traffic sudah tinggi.

Kalau ada bagian yang error saat setup atau ingin saya tambahkan fitur (misalnya laporan bisa diedit ulang, ekspor rekap ke Excel, atau notifikasi WhatsApp), tinggal bilang saja.
