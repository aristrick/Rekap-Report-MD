"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RealizationForm({ programId, territoryId }: { programId: string; territoryId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadOne(file: File, folder: string) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    return json.url as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!excelFile && !receiptFile && photoFiles.length === 0) {
      setError("Upload minimal satu bukti (excel, tanda terima, atau foto).");
      return;
    }

    setLoading(true);
    try {
      const excel_file_url = excelFile ? await uploadOne(excelFile, "realisasi-excel") : null;
      const receipt_pdf_url = receiptFile ? await uploadOne(receiptFile, "realisasi-tanda-terima") : null;
      const activity_photo_urls = await Promise.all(photoFiles.map((f) => uploadOne(f, "realisasi-foto")));

      const { data: { user } } = await supabase.auth.getUser();

      const { error: updateErr } = await supabase
        .from("program_realizations")
        .update({
          status: "submitted",
          excel_file_url,
          receipt_pdf_url,
          activity_photo_urls,
          note,
          submitted_by: user!.id,
          submitted_at: new Date().toISOString(),
        })
        .eq("program_id", programId)
        .eq("territory_id", territoryId);

      if (updateErr) throw updateErr;

      router.push(`/programs/${programId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="text-sm text-ink-dim block mb-1">Excel Realisasi</label>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setExcelFile(e.target.files?.[0] ?? null)}
          className="input-field file:mr-3 file:bg-base-line file:border-0 file:text-ink file:rounded file:px-3 file:py-1" />
      </div>
      <div>
        <label className="text-sm text-ink-dim block mb-1">Scan Tanda Terima Toko (PDF)</label>
        <input type="file" accept="application/pdf" onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
          className="input-field file:mr-3 file:bg-base-line file:border-0 file:text-ink file:rounded file:px-3 file:py-1" />
      </div>
      <div>
        <label className="text-sm text-ink-dim block mb-1">Foto Aktivitas (bisa lebih dari satu)</label>
        <input type="file" accept="image/*" multiple onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
          className="input-field file:mr-3 file:bg-base-line file:border-0 file:text-ink file:rounded file:px-3 file:py-1" />
      </div>
      <div>
        <label className="text-sm text-ink-dim block mb-1">Catatan (opsional)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input-field" />
      </div>

      {error && <p className="text-signal-red text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Mengupload..." : "Kirim Bukti Realisasi"}
      </button>
    </form>
  );
}
