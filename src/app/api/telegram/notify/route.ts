import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/telegram";

// Dipanggil dari server action / halaman web setelah RMDM membuat laporan
// atau program baru, untuk broadcast pengumuman ke group Telegram terkait.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { chatId, message } = await req.json();
  if (!chatId || !message) {
    return NextResponse.json({ ok: false, error: "chatId dan message wajib diisi" }, { status: 400 });
  }

  try {
    await sendTelegramMessage(chatId, message);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
