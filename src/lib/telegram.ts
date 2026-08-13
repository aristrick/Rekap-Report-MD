// Kumpulan helper untuk komunikasi dengan Telegram Bot API.
// Dipakai hanya di server (route API), karena butuh TELEGRAM_BOT_TOKEN.

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function sendTelegramMessage(chatId: string | number, text: string, options?: {
  replyToMessageId?: number;
  parseMode?: "Markdown" | "HTML";
}) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode ?? "Markdown",
      reply_to_message_id: options?.replyToMessageId,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gagal kirim pesan Telegram: ${res.status} ${body}`);
  }
  return res.json();
}

// Dipakai saat perlu mengambil URL unduh file (misal saat MDS submit lewat bot
// dan ingin filenya juga di-mirror / dicek oleh sistem)
export async function getTelegramFileUrl(fileId: string) {
  const infoRes = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const info = await infoRes.json();
  if (!info.ok) throw new Error("File Telegram tidak ditemukan");
  const filePath = info.result.file_path;
  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
}

export async function setTelegramWebhook(webhookUrl: string, secretToken: string) {
  const res = await fetch(`${TELEGRAM_API}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ["message"],
    }),
  });
  return res.json();
}

// Format nomor bulan jadi nama Indonesia, dipakai di banyak notifikasi
export const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Label status yang lebih ramah untuk ditampilkan di UI (bukan nama kolom database mentah)
export const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu Dikerjakan",
  submitted: "Menunggu Review",
  approved: "Disetujui",
  rejected: "Perlu Revisi",
  late: "Terlambat",
};
