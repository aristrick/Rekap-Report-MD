"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "./Spinner";
import { STATUS_LABEL } from "@/lib/telegram";

const ACCEPTED = ".xlsx,.xls,.csv,.pdf,.doc,.docx,.ppt,.pptx,.zip,.rar";

export interface TaskRow {
  id: string;
  title: string;
  assignedToName: string;
  deadlineLabel: string;
  status: string;
  fileUrl: string | null;
  fileName: string | null;
  note: string | null;
  reviewerNote: string | null;
  canUpload: boolean;
}

export default function ReportTaskModal({
  task,
  canManage,
  onClose,
}: {
  task: TaskRow;
  canManage: boolean;
  onClose: () => void;
}) {
  const supabase = createClient();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [noteText, setNoteText] = useState(task.note ?? "");
  const [reviewNoteText, setReviewNoteText] = useState("");
  const [showReviewNote, setShowReviewNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshAndClose() {
    router.refresh();
    onClose();
  }

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
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
        .eq("id", task.id);
      if (updateErr) throw updateErr;

      fetch("/api/telegram/notify-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submission_id: task.id }),
      }).catch(() => {});

      await refreshAndClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveFile() {
    setBusy(true);
    const { error: updateErr } = await supabase
      .from("report_submissions")
      .update({ file_url: null, file_name: null, status: "pending" })
      .eq("id", task.id);
    setBusy(false);
    if (updateErr) setError(updateErr.message);
    else router.refresh();
  }

  async function handleApprove() {
    setBusy(true);
    const { error: updateErr } = await supabase
      .from("report_submissions")
      .update({ status: "approved" })
      .eq("id", task.id);
    setBusy(false);
    if (updateErr) setError(updateErr.message);
    else await refreshAndClose();
  }

  async function handleRequestRevision() {
    setBusy(true);
    const { error: updateErr } = await supabase
      .from("report_submissions")
      .update({ status: "rejected", reviewer_note: reviewNoteText || null })
      .eq("id", task.id);
    setBusy(false);
    if (updateErr) setError(updateErr.message);
    else await refreshAndClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div className="card max-w-md w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="label-eyebrow mb-1">{task.deadlineLabel}</p>
            <h2 className="font-display text-lg font-bold">{task.title}</h2>
          </div>
          <button onClick={onClose} className="text-ink-dim hover:text-ink text-lg leading-none">✕</button>
        </div>
        <p className="text-xs text-ink-dim mb-4">Ditugaskan ke {task.assignedToName}</p>

        <div className="flex items-center gap-2 mb-5">
          <span className={`status-pill status-${task.status}`}>{STATUS_LABEL[task.status] ?? task.status}</span>
        </div>

        {/* Riwayat pesan */}
        {(task.note || task.reviewerNote) && (
          <div className="space-y-3 mb-5">
            {task.note && (
              <div className="bg-base border border-base-line rounded p-3">
                <p className="text-xs text-ink-dim mb-1">💬 Pesan pengirim</p>
                <p className="text-sm">{task.note}</p>
              </div>
            )}
            {task.reviewerNote && (
              <div className="bg-signal-red/10 border border-signal-red/30 rounded p-3">
                <p className="text-xs text-signal-red mb-1">⚠️ Catatan revisi</p>
                <p className="text-sm">{task.reviewerNote}</p>
              </div>
            )}
          </div>
        )}

        {/* File saat ini */}
        {task.fileUrl && (
          <a
            href={task.fileUrl}
            target="_blank"
            className="flex items-center gap-2 bg-base border border-base-line rounded px-3 py-2.5 text-sm hover:border-signal-amber transition mb-4"
          >
            📎 <span className="truncate">{task.fileName || "Lihat file"}</span>
          </a>
        )}

        {/* Upload area -- muncul kalau assignee & belum ada file atau boleh ganti */}
        {task.canUpload && (
          <div className="space-y-3 mb-2">
            {task.fileUrl && (
              <button
                onClick={handleRemoveFile}
                disabled={busy}
                className="text-xs text-signal-red hover:underline"
              >
                Hapus file &amp; upload ulang
              </button>
            )}
            {!task.fileUrl && (
              <>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="w-full border-2 border-dashed border-base-line hover:border-signal-amber rounded-lg px-4 py-6 text-center transition"
                >
                  {file ? (
                    <span className="text-sm">{file.name}</span>
                  ) : (
                    <span className="text-sm text-ink-dim">📎 Klik untuk pilih file<br /><span className="text-xs">Excel, PDF, Word, PPT, ZIP, RAR</span></span>
                  )}
                </button>
                <input ref={inputRef} type="file" accept={ACCEPTED} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />

                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Pesan untuk atasan (opsional)"
                  rows={2}
                  className="input-field text-sm w-full"
                />

                {error && <p className="text-signal-red text-sm">{error}</p>}

                <button
                  onClick={handleUpload}
                  disabled={!file || busy}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {busy && <Spinner size={14} />} Kirim Laporan
                </button>
              </>
            )}
          </div>
        )}

        {/* Panel review -- muncul untuk atasan kalau statusnya menunggu review */}
        {canManage && task.status === "submitted" && task.fileUrl && (
          <div className="space-y-3 mt-4 pt-4 border-t border-base-line">
            <p className="text-sm font-medium">Review Laporan</p>
            {error && <p className="text-signal-red text-sm">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleApprove} disabled={busy} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {busy && <Spinner size={14} />} Setujui
              </button>
              <button
                onClick={() => setShowReviewNote((v) => !v)}
                className="bg-signal-red text-white font-semibold px-4 py-2 rounded hover:brightness-110 transition flex-1"
              >
                Minta Revisi
              </button>
            </div>
            {showReviewNote && (
              <div className="space-y-2">
                <textarea
                  value={reviewNoteText}
                  onChange={(e) => setReviewNoteText(e.target.value)}
                  placeholder="Jelaskan apa yang perlu diperbaiki..."
                  rows={2}
                  className="input-field text-sm w-full"
                />
                <button
                  onClick={handleRequestRevision}
                  disabled={busy}
                  className="w-full text-sm text-signal-red hover:underline"
                >
                  Kirim permintaan revisi
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
