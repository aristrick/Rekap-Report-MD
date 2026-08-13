import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ReportTaskTable from "@/components/ReportTaskTable";
import { NAMA_BULAN } from "@/lib/telegram";
import { notFound } from "next/navigation";
import Link from "next/link";

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
      id, status, file_url, file_name, note, reviewer_note, assigned_to,
      regions ( name ),
      territories ( name )
    `)
    .eq("template_id", params.id);

  // assigned_to sekarang selalu terisi di semua tingkat, jadi cukup 1 query nama
  const assignedIds = [...new Set((submissions ?? []).map((s: any) => s.assigned_to).filter(Boolean))];
  const { data: assignedProfiles } = assignedIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", assignedIds)
    : { data: [] as any[] };
  const nameById: Record<string, string> = {};
  (assignedProfiles ?? []).forEach((p: any) => { nameById[p.id] = p.full_name; });

  const deadlineLabel = `Deadline ${new Date(template.deadline).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`;
  const rowLabel = template.target_level === "region" ? "Region" : template.target_level === "territory" ? "Wilayah" : "Nama";

  const rows = (submissions ?? []).map((s: any) => {
    const name = s.regions?.name ?? s.territories?.name ?? (s.assigned_to ? nameById[s.assigned_to] ?? "-" : "-");
    const assignedToName = s.assigned_to ? nameById[s.assigned_to] ?? "-" : "-";
    const canUpload = s.assigned_to === profile.id && (s.status === "pending" || s.status === "late" || s.status === "rejected");
    return {
      id: s.id,
      name,
      title: template.name,
      assignedToName,
      deadlineLabel,
      status: s.status,
      fileUrl: s.file_url,
      fileName: s.file_name,
      note: s.note,
      reviewerNote: s.reviewer_note,
      canUpload,
    };
  });

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

        <ReportTaskTable rows={rows} rowLabel={rowLabel} canManage={canManage} />

        <p className="text-xs text-ink-dim mt-4">
          Klik baris untuk buka detail, upload file, atau review. Format yang didukung: Excel, PDF, Word, PowerPoint, ZIP, RAR.
        </p>
      </div>
    </AppShell>
  );
}
