import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { STATUS_LABEL } from "@/lib/telegram";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = createClient();

  // Tugas SAYA sendiri -- selalu difilter assigned_to = profile.id secara eksplisit,
  // tidak mengandalkan cakupan RLS yang lebih luas (RMDM/MDM punya visibilitas oversight
  // lebih lebar untuk keperluan review, tapi dashboard cuma menampilkan tugas milik sendiri).
  const { data: myTasks } = await supabase
    .from("report_submissions")
    .select("id, status, report_templates(name, deadline)")
    .eq("assigned_to", profile.id)
    .order("created_at", { ascending: false });

  const { data: myAllTasks } = await supabase
    .from("report_submissions")
    .select("id, status")
    .eq("assigned_to", profile.id);

  // Tugas yang MENUNGGU REVIEW saya (aku pembuat template-nya, statusnya 'submitted')
  const { data: myTemplates } = await supabase.from("report_templates").select("id").eq("created_by", profile.id);
  const templateIds = (myTemplates ?? []).map((t: any) => t.id);
  const { data: awaitingReview } = templateIds.length
    ? await supabase
        .from("report_submissions")
        .select("id, status, report_templates(name)")
        .in("template_id", templateIds)
        .eq("status", "submitted")
    : { data: [] as any[] };

  const { data: realizations } = await supabase
    .from("program_realizations")
    .select("id, status, territories(name), programs(name, period_month, period_year)")
    .order("created_at", { ascending: false })
    .limit(50);

  const pendingReports = (myTasks ?? []).filter((s: any) => s.status === "pending" || s.status === "late" || s.status === "rejected");
  const pendingPrograms = (realizations ?? []).filter((r) => r.status === "pending" || r.status === "late");

  const total = myAllTasks?.length ?? 0;
  const done = (myAllTasks ?? []).filter((s) => s.status === "submitted" || s.status === "approved").length;

  return (
    <AppShell profile={profile}>
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="mb-8">
          <p className="label-eyebrow mb-1">Ringkasan</p>
          <h1 className="font-display text-2xl font-bold">
            Halo, {profile.full_name.split(" ")[0]}
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="card">
            <p className="text-ink-dim text-sm mb-1">Kepatuhan Laporan Saya</p>
            <p className="font-display text-3xl font-bold">
              {total > 0 ? Math.round((done / total) * 100) : 0}%
            </p>
            <p className="text-xs text-ink-dim mt-1">{done} dari {total} sudah terkirim</p>
          </div>
          <div className="card">
            <p className="text-ink-dim text-sm mb-1">Tugas Saya yang Menunggu</p>
            <p className="font-display text-3xl font-bold text-signal-amber">{pendingReports.length}</p>
          </div>
          <div className="card">
            <p className="text-ink-dim text-sm mb-1">Realisasi Program Belum Selesai</p>
            <p className="font-display text-3xl font-bold text-signal-amber">{pendingPrograms.length}</p>
          </div>
        </div>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-semibold">Tugas Saya</h2>
            <Link href="/reports" className="text-sm text-signal-amber hover:underline">Lihat semua →</Link>
          </div>
          <div className="card divide-y divide-base-line">
            {pendingReports.length === 0 && (
              <p className="text-ink-dim text-sm py-2">Tidak ada tugas laporan yang tertunda. Semua aman.</p>
            )}
            {pendingReports.slice(0, 8).map((s: any) => (
              <Link key={s.id} href={`/reports`} className="py-3 flex items-center justify-between hover:opacity-80 transition">
                <p className="text-sm">{s.report_templates?.name}</p>
                <span className={`status-pill status-${s.status}`}>{STATUS_LABEL[s.status] ?? s.status}</span>
              </Link>
            ))}
          </div>
        </section>

        {templateIds.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold">Menunggu Review Saya</h2>
            </div>
            <div className="card divide-y divide-base-line">
              {(awaitingReview ?? []).length === 0 && (
                <p className="text-ink-dim text-sm py-2">Tidak ada laporan yang menunggu review.</p>
              )}
              {(awaitingReview ?? []).slice(0, 8).map((s: any) => (
                <Link key={s.id} href={`/reports`} className="py-3 flex items-center justify-between hover:opacity-80 transition">
                  <p className="text-sm">{s.report_templates?.name}</p>
                  <span className="status-pill status-submitted">menunggu review</span>
                </Link>
              ))}
            </div>
          </section>
        )}

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
                <span className={`status-pill status-${r.status}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
