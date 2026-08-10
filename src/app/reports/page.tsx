import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import Link from "next/link";
import { NAMA_BULAN } from "@/lib/telegram";

export default async function ReportsPage() {
  const profile = await requireProfile();
  const supabase = createClient();
  const canCreate = profile.role === "mdm" || profile.role === "rmdm";

  const { data: templates } = await supabase
    .from("report_templates")
    .select("id, name, period_month, period_year, deadline, regions(name), report_submissions(status)")
    .order("created_at", { ascending: false });

  return (
    <AppShell profile={profile}>
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="label-eyebrow mb-1">Laporan Bulanan</p>
            <h1 className="font-display text-2xl font-bold">Daftar Laporan</h1>
          </div>
          {canCreate && (
            <Link href="/reports/new" className="btn-primary">+ Buat Laporan Baru</Link>
          )}
        </div>

        <div className="grid gap-3">
          {(templates ?? []).length === 0 && (
            <p className="text-ink-dim text-sm">Belum ada laporan dibuat.</p>
          )}
          {(templates ?? []).map((t: any) => {
            const subs = t.report_submissions ?? [];
            const done = subs.filter((s: any) => s.status === "submitted" || s.status === "approved").length;
            const total = subs.length;
            return (
              <Link key={t.id} href={`/reports/${t.id}`} className="card flex items-center justify-between hover:border-signal-amber/50 transition">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-ink-dim mt-1 font-mono">
                    {NAMA_BULAN[t.period_month - 1]} {t.period_year} · {t.regions?.name} · Deadline {new Date(t.deadline).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold">{done}/{total}</p>
                  <p className="text-xs text-ink-dim">wilayah selesai</p>
                </div>
              </Link>
            );
          })}
        </div>
            </div>
    </AppShell>
  );
}
