import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";

// Dipanggil dari client setelah upload berhasil. Mencari group Telegram yang
// relevan (berdasarkan region/wilayah penerima tugas) dan mengirim notifikasi
// bahwa ada laporan yang menunggu review.
export async function POST(req: NextRequest) {
  try {
    const { submission_id } = await req.json();
    const supabase = createServiceRoleClient();

    const { data: submission } = await supabase
      .from("report_submissions")
      .select(`
        id, region_id, territory_id, submitted_by,
        report_templates ( name ),
        regions ( name ),
        territories ( name, region_id )
      `)
      .eq("id", submission_id)
      .single();

    if (!submission) return NextResponse.json({ ok: true });

    const { data: submitter } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", (submission as any).submitted_by)
      .maybeSingle();

    const templateName = (submission as any).report_templates?.name ?? "Laporan";
    const submitterName = submitter?.full_name ?? "Seseorang";

    const regionId = (submission as any).region_id ?? (submission as any).territories?.region_id;
    const territoryId = (submission as any).territory_id;

    const { data: group } = await supabase
      .from("telegram_groups")
      .select("chat_id")
      .or(`territory_id.eq.${territoryId ?? "00000000-0000-0000-0000-000000000000"},region_id.eq.${regionId ?? "00000000-0000-0000-0000-000000000000"}`)
      .limit(1)
      .maybeSingle();

    if (group) {
      await sendTelegramMessage(
        group.chat_id,
        `✅ *${templateName}* sudah dikirim oleh *${submitterName}* dan menunggu review.`
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    // Notifikasi gagal tidak boleh mengganggu alur utama (upload sudah tersimpan)
    return NextResponse.json({ ok: true });
  }
}
