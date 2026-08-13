import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Notifikasi dihitung langsung dari data (tanpa tabel notifikasi terpisah):
// 1. Tugas yang perlu direvisi (assigned_to = aku, status = 'rejected')
// 2. Tugas yang menunggu review-ku (aku pembuat template-nya, status = 'submitted')
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, items: [] }, { status: 401 });

  const { data: needRevision } = await supabase
    .from("report_submissions")
    .select("id, template_id, reviewer_note, report_templates(name)")
    .eq("assigned_to", user.id)
    .eq("status", "rejected");

  const { data: myTemplates } = await supabase
    .from("report_templates")
    .select("id")
    .eq("created_by", user.id);

  const templateIds = (myTemplates ?? []).map((t: any) => t.id);

  const { data: awaitingReview } = templateIds.length
    ? await supabase
        .from("report_submissions")
        .select("id, template_id, report_templates(name)")
        .in("template_id", templateIds)
        .eq("status", "submitted")
    : { data: [] as any[] };

  const items = [
    ...(needRevision ?? []).map((r: any) => ({
      id: r.id,
      type: "revision" as const,
      templateId: r.template_id,
      title: r.report_templates?.name ?? "Laporan",
      detail: r.reviewer_note ? `Perlu revisi: ${r.reviewer_note}` : "Perlu revisi",
    })),
    ...(awaitingReview ?? []).map((r: any) => ({
      id: r.id,
      type: "review" as const,
      templateId: r.template_id,
      title: r.report_templates?.name ?? "Laporan",
      detail: "Menunggu review kamu",
    })),
  ];

  return NextResponse.json({ ok: true, items });
}
