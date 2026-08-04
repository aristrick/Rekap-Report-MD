import type { Metadata } from "next";
import "./globals.css";

// Seluruh halaman di aplikasi ini butuh sesi login (cookie) untuk berfungsi,
// jadi tidak ada gunanya di-generate statis saat build. Baris ini memaksa
// Next.js selalu render saat request, dan juga mencegah build gagal kalau
// environment variable Supabase belum terbaca di tahap build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rekap Report MD",
  description: "Pelacakan laporan bulanan dan realisasi program tim lapangan",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
