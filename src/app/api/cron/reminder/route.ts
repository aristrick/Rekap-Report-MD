import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";

// Route ini dipanggil terjadwal oleh Vercel Cron (lihat vercel.json).
// Tugasnya: cari report_submissions yang masih 'pending' dan:
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

  // Ambil semua submission yang masih pending, sertakan info template & wilayah
  const { data: pendingSubs, error } = await supabase
    .from("report_submissions")
    .select(`
      id, status, territory_id,
      report_templates ( id, name, deadline, region_id ),
      territories ( id, name, region_id )
    `)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let remindedH1 = 0;
  let markedLate = 0;

  for (const sub of pendingSubs ?? []) {
    const template = (sub as any).report_templates;
    const territory = (sub as any).territories;
    if (!template || !territory) continue;

    const deadline = new Date(template.deadline);

    // Cari group telegram untuk wilayah ini (fallback ke group region)
    const { data: group } = await supabase
      .from("telegram_groups")
      .select("chat_id")
      .or(`territory_id.eq.${territory.id},region_id.eq.${territory.region_id}`)
      .limit(1)
      .maybeSingle();

    if (!group) continue;

    if (deadline < now) {
      // Lewat deadline -> tandai late + kirim pengingat
      await supabase.from("report_submissions").update({ status: "late" }).eq("id", sub.id);
      await sendTelegramMessage(
        group.chat_id,
        `🔴 *TERLAMBAT*: Wilayah *${territory.name}* belum mengirim *${template.name}*. Deadline sudah lewat, mohon segera kirim.`
      );
      markedLate++;
    } else if (deadline <= in24h) {
      await sendTelegramMessage(
        group.chat_id,
        `🟡 *Pengingat H-1*: Wilayah *${territory.name}* belum mengirim *${template.name}*. Deadline: ${deadline.toLocaleString("id-ID")}.`
      );
      remindedH1++;
    }
  }

  return NextResponse.json({ ok: true, remindedH1, markedLate, checked: pendingSubs?.length ?? 0 });
}
