"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConfirmButton from "./ConfirmButton";
import Spinner from "./Spinner";

interface Props {
  submissionId: string;
  fileUrl: string | null;
  fileName: string | null;
  canUpload: boolean;
  note: string | null;
}

const ACCEPTED = ".xlsx,.xls,.csv,.pdf,.doc,.docx,.ppt,.pptx,.zip,.rar";

export default function ReportUploadCell({ submissionId, fileUrl, fileName, canUpload, note }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [noteText, setNoteText] = useState(note ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "laporan-bulanan");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      const { data: { user } } = await supabase.auth.getUser();
      const { error: updateErr } = await supabase
        .from("report_submissions")
        .update({
          file_url: json.url,
          file_name: file.name,
          note: noteText || null,
          status: "submitted",
          reviewer_note: null,
          submitted_by: user!.id,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
      if (updateErr) throw updateErr;

      fetch("/api/telegram/notify-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: submissionId }),
      }).catch(() => {});

      setFile(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveFile() {
    const { error: updateErr } = await supabase
      .from("report_submissions")
      .update({ file_url: null, file_name: null, status: "pending" })
      .eq("id", submissionId);
    if (updateErr) setError(updateErr.message);
    else router.refresh();
  }

  if (!canUpload && !fileUrl) {
    return <span className="text-xs text-ink-dim">—</span>;
  }

  // Sudah ada file & tidak sedang boleh ganti (menunggu review / sudah disetujui)
  if (fileUrl && !canUpload) {
    return (
      <a href={fileUrl} target="_blank" className="text-xs text-signal-amber hover:underline">
        📎 {fileName || "Lihat file"}
      </a>
    );
  }

  // Sudah ada file, boleh diganti (misalnya status 'rejected' / revisi)
  if (fileUrl && canUpload) {
    return (
      <div className="flex items-center gap-2">
        <a href={fileUrl} target="_blank" className="text-xs text-signal-amber hover:underline">
          📎 {fileName || "Lihat file"}
        </a>
        <ConfirmButton
          title="Hapus file ini?"
          description="Kamu bisa upload file pengganti setelah ini dihapus."
          confirmLabel="Ya, hapus"
          variant="danger"
          onConfirm={handleRemoveFile}
          className="text-xs text-signal-red hover:underline"
        >
          Hapus
        </ConfirmButton>
      </div>
    );
  }

  // Belum ada file & boleh upload -- tampilkan kotak upload yang jelas
  return (
    <div className="w-48">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-base-line hover:border-signal-amber rounded px-3 py-3 text-center transition"
      >
        {file ? (
          <span className="text-xs text-ink">{file.name}</span>
        ) : (
          <span className="text-xs text-ink-dim">📎 Klik untuk pilih file</span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="hidden"
      />

      {file && (
        <div className="mt-2 space-y-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Catatan untuk atasan (opsional)"
            rows={2}
            className="input-field !py-1.5 text-xs w-full"
          />
          <ConfirmButton
            title="Kirim file ini sebagai laporan?"
            description={`File "${file.name}" akan dikirim dan menunggu review atasan.`}
            confirmLabel="Ya, kirim"
            onConfirm={handleUpload}
            className="btn-primary !py-1.5 text-xs w-full flex items-center justify-center gap-1.5"
          >
            {uploading && <Spinner size={11} />} Kirim
          </ConfirmButton>
        </div>
      )}
      {error && <p className="text-xs text-signal-red mt-1">{error}</p>}
    </div>
  );
}
