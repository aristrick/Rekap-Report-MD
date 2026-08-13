import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";

// Route ini dipanggil terjadwal oleh Vercel Cron (lihat vercel.json).
// Tugasnya: cari report_submissions yang masih 'pending' di semua tingkat
// (region/RMDM, wilayah/MDS, orang/Admin-TL) dan:
//  - deadline < 24 jam lagi -> kirim pengingat "H-1"
//  - deadline sudah lewat -> tandai 'late' dan kirim pengingat susulan
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const { data: pendingSubs, error } = await supabase
    .from("report_submissions")
    .select(`
      id, status, territory_id, region_id, assigned_to,
      report_templates ( id, name, deadline ),
      territories ( id, name, region_id ),
      regions ( id, name )
    `)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let remindedH1 = 0;
  let markedLate = 0;

  for (const sub of pendingSubs ?? []) {
    const template = (sub as any).report_templates;
    if (!template) continue;

    const territory = (sub as any).territories;
    const region = (sub as any).regions;
    const deadline = new Date(template.deadline);

    let label = "";
    let chatId: string | null = null;

    if (territory) {
      label = `Wilayah *${territory.name}*`;
      const { data: group } = await supabase
        .from("telegram_groups")
        .select("chat_id")
        .or(`territory_id.eq.${territory.id},region_id.eq.${territory.region_id}`)
        .limit(1)
        .maybeSingle();
      chatId = group?.chat_id ?? null;
    } else if (region) {
      label = `Region *${region.name}*`;
      const { data: group } = await supabase
        .from("telegram_groups")
        .select("chat_id")
        .eq("region_id", region.id)
        .limit(1)
        .maybeSingle();
      chatId = group?.chat_id ?? null;
    } else if (sub.assigned_to) {
      const { data: assignee } = await supabase
        .from("profiles")
        .select("full_name, telegram_chat_id")
        .eq("id", sub.assigned_to)
        .maybeSingle();
      label = assignee?.full_name ?? "Seseorang";
      chatId = assignee?.telegram_chat_id ?? null;
    }

    if (!chatId) continue;

    if (deadline < now) {
      await supabase.from("report_submissions").update({ status: "late" }).eq("id", sub.id);
      await sendTelegramMessage(chatId, `🔴 *TERLAMBAT*: ${label} belum mengirim *${template.name}*. Deadline sudah lewat, mohon segera kirim.`);
      markedLate++;
    } else if (deadline <= in24h) {
      await sendTelegramMessage(chatId, `🟡 *Pengingat H-1*: ${label} belum mengirim *${template.name}*. Deadline: ${deadline.toLocaleString("id-ID")}.`);
      remindedH1++;
    }
  }

  return NextResponse.json({ ok: true, remindedH1, markedLate, checked: pendingSubs?.length ?? 0 });
}
