import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NAMA_BULAN } from "@/lib/telegram";

async function deleteReportTemplate(formData: FormData) {
  "use server";
  const supabase = createClient();
  await supabase.from("report_templates").delete().eq("id", formData.get("id") as string);
  redirect("/reports");
}

export default async function ReportsPage() {
  const profile = await requireProfile();
  const supabase = createClient();
  const canManage = profile.role === "mdm" || profile.role === "rmdm";

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
          {canManage && (
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
              <div key={t.id} className="card flex items-center justify-between hover:border-signal-amber/50 transition">
                <Link href={`/reports/${t.id}`} className="flex-1 min-w-0">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-ink-dim mt-1 font-mono">
                    {NAMA_BULAN[t.period_month - 1]} {t.period_year} · {t.regions?.name} · Deadline {new Date(t.deadline).toLocaleDateString("id-ID")}
                  </p>
                </Link>
                <div className="flex items-center gap-4">
                  <Link href={`/reports/${t.id}`} className="text-right block">
                    <p className="font-display text-xl font-bold">{done}/{total}</p>
                    <p className="text-xs text-ink-dim">wilayah selesai</p>
                  </Link>
                  {canManage && (
                    <div className="flex flex-col gap-1 items-end">
                      <Link href={`/reports/${t.id}/edit`} className="text-xs text-signal-amber hover:underline">Edit</Link>
                      <form action={deleteReportTemplate}>
                        <input type="hidden" name="id" value={t.id} />
                        <ConfirmSubmitButton
                          title={`Hapus laporan "${t.name}"?`}
                          description="Semua data pengiriman untuk laporan ini juga akan ikut terhapus. Tindakan ini permanen."
                          variant="danger"
                          className="text-xs text-signal-red hover:underline"
                        >
                          Hapus
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
