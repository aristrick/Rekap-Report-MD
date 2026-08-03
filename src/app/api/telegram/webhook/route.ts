import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";

// Endpoint ini didaftarkan sebagai webhook Telegram (lihat README bagian setup bot).
// Telegram akan POST setiap ada pesan baru di group tempat bot ditambahkan.
export async function POST(req: NextRequest) {
  // 1. Validasi bahwa request benar-benar dari Telegram (bukan orang iseng)
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: "invalid secret" }, { status: 401 });
  }

  const update = await req.json();
  const message = update.message;
  if (!message) return NextResponse.json({ ok: true }); // update jenis lain, abaikan

  const chatId: string = String(message.chat.id);
  const fromUserId: string = String(message.from?.id ?? "");
  const supabase = createServiceRoleClient();

  // 2. Cari group ini terdaftar untuk wilayah/region mana
  const { data: group } = await supabase
    .from("telegram_groups")
    .select("id, region_id, territory_id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (!group) {
    // Group belum didaftarkan di web -> beri tahu sekali agar admin daftarkan chat_id ini
    return NextResponse.json({ ok: true });
  }

  // 3. Pesan berisi file (dokumen/excel/pdf) atau foto?
  const hasDocument = !!message.document;
  const hasPhoto = Array.isArray(message.photo) && message.photo.length > 0;
  if (!hasDocument && !hasPhoto) {
    return NextResponse.json({ ok: true }); // bukan pengiriman file, abaikan
  }

  // 4. Cocokkan pengirim ke profil terdaftar
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, territory_id")
    .eq("telegram_user_id", fromUserId)
    .maybeSingle();

  if (!profile) {
    await sendTelegramMessage(
      chatId,
      "⚠️ Nomor Telegram kamu belum terdaftar di sistem. Minta MDS/RMDM kamu untuk menautkan akun Telegram ini di halaman *Profil*.",
      { replyToMessageId: message.message_id }
    );
    return NextResponse.json({ ok: true });
  }

  const territoryId = group.territory_id ?? profile.territory_id;
  if (!territoryId) {
    return NextResponse.json({ ok: true });
  }

  // 5. Cari submission yang masih pending/late untuk wilayah ini, paling dekat deadline-nya
  const { data: submission } = await supabase
    .from("report_submissions")
    .select("id, template_id, status, report_templates(name, deadline)")
    .eq("territory_id", territoryId)
    .in("status", ["pending", "late"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!submission) {
    await sendTelegramMessage(
      chatId,
      `File diterima, tapi tidak ada laporan yang sedang menunggu untuk wilayah ini. Cek kembali di web ya, ${profile.full_name}.`,
      { replyToMessageId: message.message_id }
    );
    return NextResponse.json({ ok: true });
  }

  const fileId = hasDocument
    ? message.document.file_id
    : message.photo[message.photo.length - 1].file_id; // ambil resolusi terbesar

  const now = new Date().toISOString();

  await supabase
    .from("report_submissions")
    .update({
      status: "submitted",
      submitted_by: profile.id,
      submitted_at: now,
      telegram_file_id: fileId,
      telegram_message_id: String(message.message_id),
    })
    .eq("id", submission.id);

  await supabase.from("activity_logs").insert({
    actor_id: profile.id,
    action: "submit_report_via_telegram",
    entity_type: "report_submissions",
    entity_id: submission.id,
  });

  const templateName = (submission as any).report_templates?.name ?? "Laporan";

  await sendTelegramMessage(
    chatId,
    `✅ *${templateName}* berhasil disubmit oleh *${profile.full_name}*.`,
    { replyToMessageId: message.message_id }
  );

  return NextResponse.json({ ok: true });
}
