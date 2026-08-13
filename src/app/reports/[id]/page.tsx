import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ReportUploadCell from "@/components/ReportUploadCell";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
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
  const reviewerNote = formData.get("reviewer_note") as string;

  await supabase
    .from("report_submissions")
    .update({ status, reviewer_note: status === "rejected" ? reviewerNote : null })
    .eq("id", submissionId);

  redirect(`/reports/${templateId}`);
}

const TIER_LABEL: Record<string, string> = {
  region: "Region (RMDM)",
  territory: "Wilayah (MDS)",
  person: "Orang (Admin/TL)",
};

export default async function ReportDetailPage({ params }: { params: { id: string } }) {
  const profile = await requireProfile();
  const supabase = createClient();

  const { data: template } = await supabase
    .from("report_templates")
    .select("id, name, description, period_month, period_year, deadline, target_level, created_by")
    .eq("id", params.id)
    .single();

  if (!template) notFound();

  const canManage = template.created_by === profile.id || profile.role === "mdm";

  const { data: submissions } = await supabase
    .from("report_submissions")
    .select(`
      id, status, submitted_at, file_url, file_name, note, reviewer_note, assigned_to,
      region_id, territory_id,
      regions ( name ),
      territories ( id, name, region_id )
    `)
    .eq("template_id", params.id);

  // Nama penerima tugas untuk baris "person" (assigned_to langsung)
  const assignedIds = [...new Set((submissions ?? []).map((s: any) => s.assigned_to).filter(Boolean))];
  const { data: assignedProfiles } = assignedIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", assignedIds)
    : { data: [] as any[] };
  const nameById: Record<string, string> = {};
  (assignedProfiles ?? []).forEach((p: any) => { nameById[p.id] = p.full_name; });

  // Nama RMDM per region & MDS per wilayah (untuk kolom "Ditugaskan ke" di tingkat region/territory)
  const regionIds = (submissions ?? []).map((s: any) => s.region_id).filter(Boolean);
  const territoryIds = (submissions ?? []).map((s: any) => s.territory_id).filter(Boolean);
  const { data: rmdmProfiles } = regionIds.length
    ? await supabase.from("profiles").select("id, full_name, region_id").eq("role", "rmdm").in("region_id", regionIds)
    : { data: [] as any[] };
  const { data: mdsProfiles } = territoryIds.length
    ? await supabase.from("profiles").select("id, full_name, territory_id").eq("role", "mds").in("territory_id", territoryIds)
    : { data: [] as any[] };
  const rmdmByRegion: Record<string, string> = {};
  (rmdmProfiles ?? []).forEach((p: any) => { rmdmByRegion[p.region_id] = p.full_name; });
  const mdsByTerritory: Record<string, string> = {};
  (mdsProfiles ?? []).forEach((p: any) => { mdsByTerritory[p.territory_id] = p.full_name; });

  const deadlineLabel = new Date(template.deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  const rowLabel = template.target_level === "region" ? "Region" : template.target_level === "territory" ? "Wilayah" : "Nama";

  function rowName(s: any) {
    if (s.regions) return s.regions.name;
    if (s.territories) return s.territories.name;
    if (s.assigned_to) return nameById[s.assigned_to] ?? "-";
    return "-";
  }

  function assignedTo(s: any) {
    if (s.region_id) return rmdmByRegion[s.region_id] ?? "Belum ada RMDM";
    if (s.territory_id) return mdsByTerritory[s.territory_id] ?? "Belum ada MDS";
    if (s.assigned_to) return nameById[s.assigned_to] ?? "-";
    return "-";
  }

  function canUploadRow(s: any) {
    const mine =
      (s.region_id && profile.role === "rmdm" && profile.region_id === s.region_id) ||
      (s.territory_id && ["mds", "admin", "tl"].includes(profile.role) && profile.territory_id === s.territory_id) ||
      (s.assigned_to && s.assigned_to === profile.id);
    return mine && (s.status === "pending" || s.status === "late" || s.status === "rejected");
  }

  return (
    <AppShell profile={profile}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <Link href="/reports" className="text-sm text-ink-dim hover:text-ink">← Kembali ke daftar laporan</Link>

        <div className="mt-4 mb-2 flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <p className="label-eyebrow mb-1">
              {NAMA_BULAN[template.period_month - 1]} {template.period_year} · {TIER_LABEL[template.target_level]}
            </p>
            <h1 className="font-display text-2xl font-bold">{template.name}</h1>
          </div>
        </div>
        {template.description && <p className="text-ink-dim text-sm mb-4">{template.description}</p>}

        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-dim border-b border-base-line bg-base">
                <th className="px-4 py-3 font-normal">{rowLabel}</th>
                <th className="px-4 py-3 font-normal">Ditugaskan ke</th>
                <th className="px-4 py-3 font-normal">Deadline</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">File</th>
                {canManage && <th className="px-4 py-3 font-normal">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-base-line">
              {(submissions ?? []).map((s: any) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium">{rowName(s)}</td>
                  <td className="px-4 py-3 text-ink-dim">{assignedTo(s)}</td>
                  <td className="px-4 py-3 text-ink-dim font-mono text-xs">{deadlineLabel}</td>
                  <td className="px-4 py-3">
                    <span className={`status-pill status-${s.status}`}>{s.status}</span>
                    {s.status === "rejected" && s.reviewer_note && (
                      <p className="text-xs text-signal-red mt-1 max-w-[160px]">Revisi: {s.reviewer_note}</p>
                    )}
                    {s.note && <p className="text-xs text-ink-dim mt-1 max-w-[160px]">💬 {s.note}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <ReportUploadCell
                      submissionId={s.id}
                      fileUrl={s.file_url}
                      fileName={s.file_name}
                      canUpload={canUploadRow(s)}
                      note={s.note}
                    />
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      {s.file_url && s.status === "submitted" && (
                        <div className="flex flex-col gap-2 w-40">
                          <form action={markStatus}>
                            <input type="hidden" name="submission_id" value={s.id} />
                            <input type="hidden" name="template_id" value={template.id} />
                            <input type="hidden" name="status" value="approved" />
                            <ConfirmSubmitButton title="Setujui laporan ini?" className="text-signal-green text-xs hover:underline">
                              Setujui
                            </ConfirmSubmitButton>
                          </form>
                          <RejectForm submissionId={s.id} templateId={template.id} />
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-ink-dim mt-4">
          File bisa dikirim lewat group Telegram (otomatis terdeteksi bot), atau langsung upload di kolom "File".
          Format yang didukung: Excel, PDF, Word, PowerPoint, ZIP, RAR.
        </p>
      </div>
    </AppShell>
  );
}

function RejectForm({ submissionId, templateId }: { submissionId: string; templateId: string }) {
  async function reject(formData: FormData) {
    "use server";
    const supabase = createClient();
    const reviewerNote = formData.get("reviewer_note") as string;
    await supabase
      .from("report_submissions")
      .update({ status: "rejected", reviewer_note: reviewerNote })
      .eq("id", submissionId);
    redirect(`/reports/${templateId}`);
  }

  return (
    <form action={reject} className="space-y-1">
      <input
        name="reviewer_note"
        placeholder="Catatan revisi (opsional)"
        className="input-field !py-1 text-xs w-full"
      />
      <ConfirmSubmitButton
        title="Minta revisi laporan ini?"
        description="RMDM/MDS terkait akan bisa hapus & upload ulang filenya."
        variant="danger"
        className="text-signal-red text-xs hover:underline"
      >
        Minta Revisi
      </ConfirmSubmitButton>
    </form>
  );
}
