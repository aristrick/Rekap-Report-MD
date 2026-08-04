import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import { NAMA_BULAN } from "@/lib/telegram";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

async function markStatus(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const submissionId = formData.get("submission_id") as string;
  const status = formData.get("status") as string;
  const templateId = formData.get("template_id") as string;

  await supabase.from("report_submissions").update({ status }).eq("id", submissionId);
  redirect(`/reports/${templateId}`);
}

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const profile = await requireProfile();
  const supabase = createClient();
  const canManage = profile.role === "mdm" || profile.role === "rmdm";

  const { data: template } = await supabase
    .from("report_templates")
    .select("id, name, description, period_month, period_year, deadline, regions(name)")
    .eq("id", params.id)
    .single();

  if (!template) notFound();

  const { data: submissions } = await supabase
    .from("report_submissions")
    .select("id, status, submitted_at, note, territories(id, name), profiles!report_submissions_submitted_by_fkey(full_name)")
    .eq("template_id", params.id)
    .order("territories(name)", { ascending: true });

  return (
    <div>
      <Navbar profile={profile} />
      <main className="max-w-4xl mx-auto px-5 py-8">
        <Link href="/reports" className="text-sm text-ink-dim hover:text-ink">← Kembali ke daftar laporan</Link>

        <div className="mt-4 mb-8">
          <p className="label-eyebrow mb-1">
            {NAMA_BULAN[template.period_month - 1]} {template.period_year} · {(template as any).regions?.name}
          </p>
          <h1 className="font-display text-2xl font-bold">{template.name}</h1>
          {template.description && <p className="text-ink-dim text-sm mt-1">{template.description}</p>}
          <p className="text-sm text-signal-amber mt-2 font-mono">
            Deadline: {new Date(template.deadline).toLocaleString("id-ID")}
          </p>
        </div>

        <div className="card overflow-hidden !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-dim border-b border-base-line">
                <th className="px-4 py-3 font-normal">Wilayah</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Dikirim oleh</th>
                <th className="px-4 py-3 font-normal">Waktu</th>
                {canManage && <th className="px-4 py-3 font-normal">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-base-line">
              {(submissions ?? []).map((s: any) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.territories?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`status-pill status-${s.status}`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-dim">{s.profiles?.full_name ?? "-"}</td>
                  <td className="px-4 py-3 text-ink-dim font-mono text-xs">
                    {s.submitted_at ? new Date(s.submitted_at).toLocaleString("id-ID") : "-"}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <form action={markStatus} className="flex gap-2">
                        <input type="hidden" name="submission_id" value={s.id} />
                        <input type="hidden" name="template_id" value={template.id} />
                        <button name="status" value="approved" className="text-signal-green text-xs hover:underline">Setujui</button>
                        <button name="status" value="rejected" className="text-signal-red text-xs hover:underline">Tolak</button>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-ink-dim mt-4">
          Pengiriman file dilakukan lewat group Telegram wilayah masing-masing. Status di halaman ini
          diperbarui otomatis oleh bot begitu file diterima.
        </p>
      </main>
    </div>
  );
}
