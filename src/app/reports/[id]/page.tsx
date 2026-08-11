import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ReportUploadCell from "@/components/ReportUploadCell";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import AssignSelect from "@/components/AssignSelect";
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
    .select("id, name, description, period_month, period_year, deadline, region_id, regions(name)")
    .eq("id", params.id)
    .single();

  if (!template) notFound();

  const { data: submissions } = await supabase
    .from("report_submissions")
    .select("id, status, submitted_at, file_url, file_name, assigned_to, territories(id, name)")
    .eq("template_id", params.id)
    .order("territories(name)", { ascending: true });

  const territoryIds = (submissions ?? []).map((s: any) => s.territories?.id).filter(Boolean);
  const { data: assignees } = territoryIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, territory_id")
        .eq("role", "mds")
        .in("territory_id", territoryIds)
    : { data: [] as any[] };

  const assigneeByTerritory: Record<string, string> = {};
  (assignees ?? []).forEach((a: any) => { assigneeByTerritory[a.territory_id] = a.full_name; });

  // Anggota (Admin/TL) di wilayah MDS yang sedang login, untuk dropdown penugasan
  const { data: myMembers } = profile.role === "mds"
    ? await supabase.from("profiles").select("id, full_name").eq("supervisor_id", profile.id)
    : { data: [] as any[] };

  // Nama untuk semua submission yang sudah ditugaskan (supaya MDM/RMDM juga bisa lihat)
  const assignedToIds = [...new Set((submissions ?? []).map((s: any) => s.assigned_to).filter(Boolean))];
  const { data: assignedProfiles } = assignedToIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", assignedToIds)
    : { data: [] as any[] };

  const assignedNames: Record<string, string> = {};
  (assignedProfiles ?? []).forEach((m: any) => { assignedNames[m.id] = m.full_name; });

  const deadlineLabel = new Date(template.deadline).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <AppShell profile={profile}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <Link href="/reports" className="text-sm text-ink-dim hover:text-ink">← Kembali ke daftar laporan</Link>

        <div className="mt-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <p className="label-eyebrow mb-1">
              {NAMA_BULAN[template.period_month - 1]} {template.period_year} · {(template as any).regions?.name}
            </p>
            <h1 className="font-display text-2xl font-bold">{template.name}</h1>
          </div>
        </div>
        {template.description && <p className="text-ink-dim text-sm mb-4">{template.description}</p>}

        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-dim border-b border-base-line bg-base">
                <th className="px-4 py-3 font-normal">Wilayah</th>
                <th className="px-4 py-3 font-normal">Ditugaskan ke</th>
                <th className="px-4 py-3 font-normal">Deadline</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">File</th>
                {canManage && <th className="px-4 py-3 font-normal">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-base-line">
              {(submissions ?? []).map((s: any) => {
                const canUpload =
                  ["mds", "admin", "tl"].includes(profile.role) &&
                  profile.territory_id === s.territories?.id &&
                  (s.status === "pending" || s.status === "late");
                const isMyTerritoryAsMds = profile.role === "mds" && profile.territory_id === s.territories?.id;
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium">{s.territories?.name}</td>
                    <td className="px-4 py-3 text-ink-dim">
                      {isMyTerritoryAsMds ? (
                        <AssignSelect
                          submissionId={s.id}
                          currentAssignee={s.assigned_to}
                          members={myMembers ?? []}
                        />
                      ) : (
                        (s.assigned_to && assignedNames[s.assigned_to]) || assigneeByTerritory[s.territories?.id] || "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-dim font-mono text-xs">{deadlineLabel}</td>
                    <td className="px-4 py-3">
                      <span className={`status-pill status-${s.status}`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ReportUploadCell
                        submissionId={s.id}
                        fileUrl={s.file_url}
                        fileName={s.file_name}
                        canUpload={canUpload}
                      />
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <form action={markStatus}>
                            <input type="hidden" name="submission_id" value={s.id} />
                            <input type="hidden" name="template_id" value={template.id} />
                            <input type="hidden" name="status" value="approved" />
                            <ConfirmSubmitButton
                              title="Setujui laporan ini?"
                              className="text-signal-green text-xs hover:underline"
                            >
                              Setujui
                            </ConfirmSubmitButton>
                          </form>
                          <form action={markStatus}>
                            <input type="hidden" name="submission_id" value={s.id} />
                            <input type="hidden" name="template_id" value={template.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <ConfirmSubmitButton
                              title="Tolak laporan ini?"
                              variant="danger"
                              className="text-signal-red text-xs hover:underline"
                            >
                              Tolak
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-ink-dim mt-4">
          File bisa dikirim lewat group Telegram wilayah (otomatis terdeteksi bot), atau langsung upload di kolom "File" pada baris wilayah kamu.
        </p>
      </div>
    </AppShell>
  );
}
