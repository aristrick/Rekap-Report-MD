import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = createClient();

  // RLS otomatis membatasi baris sesuai role/region/wilayah user yang login,
  // jadi query di sini tidak perlu filter manual berdasarkan role.
  const { data: submissions } = await supabase
    .from("report_submissions")
    .select("id, status, territories(name), report_templates(name, deadline)")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: realizations } = await supabase
    .from("program_realizations")
    .select("id, status, territories(name), programs(name, period_month, period_year)")
    .order("created_at", { ascending: false })
    .limit(50);

  const pendingReports = (submissions ?? []).filter((s) => s.status === "pending" || s.status === "late");
  const pendingPrograms = (realizations ?? []).filter((r) => r.status === "pending" || r.status === "late");

  const total = submissions?.length ?? 0;
  const done = (submissions ?? []).filter((s) => s.status === "submitted" || s.status === "approved").length;

  return (
    <div>
      <Navbar profile={profile} />
      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="mb-8">
          <p className="label-eyebrow mb-1">Ringkasan</p>
          <h1 className="font-display text-2xl font-bold">
            Halo, {profile.full_name.split(" ")[0]}
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="card">
            <p className="text-ink-dim text-sm mb-1">Kepatuhan Laporan Bulanan</p>
            <p className="font-display text-3xl font-bold">
              {total > 0 ? Math.round((done / total) * 100) : 0}%
            </p>
            <p className="text-xs text-ink-dim mt-1">{done} dari {total} sudah terkirim</p>
          </div>
          <div className="card">
            <p className="text-ink-dim text-sm mb-1">Laporan Menunggu / Terlambat</p>
            <p className="font-display text-3xl font-bold text-signal-amber">{pendingReports.length}</p>
          </div>
          <div className="card">
            <p className="text-ink-dim text-sm mb-1">Realisasi Program Belum Selesai</p>
            <p className="font-display text-3xl font-bold text-signal-amber">{pendingPrograms.length}</p>
          </div>
        </div>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Laporan Perlu Perhatian</h2>
            <Link href="/reports" className="text-sm text-signal-amber hover:underline">Lihat semua →</Link>
          </div>
          <div className="card divide-y divide-base-line">
            {pendingReports.length === 0 && (
              <p className="text-ink-dim text-sm py-2">Tidak ada laporan yang tertunda. Semua aman.</p>
            )}
            {pendingReports.slice(0, 8).map((s: any) => (
              <div key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm">{s.report_templates?.name}</p>
                  <p className="text-xs text-ink-dim">{s.territories?.name}</p>
                </div>
                <span className={`status-pill status-${s.status}`}>{s.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Realisasi Program Perlu Perhatian</h2>
            <Link href="/programs" className="text-sm text-signal-amber hover:underline">Lihat semua →</Link>
          </div>
          <div className="card divide-y divide-base-line">
            {pendingPrograms.length === 0 && (
              <p className="text-ink-dim text-sm py-2">Tidak ada realisasi yang tertunda.</p>
            )}
            {pendingPrograms.slice(0, 8).map((r: any) => (
              <div key={r.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm">{r.programs?.name}</p>
                  <p className="text-xs text-ink-dim">{r.territories?.name}</p>
                </div>
                <span className={`status-pill status-${r.status}`}>{r.status}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
