"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConfirmButton from "./ConfirmButton";
import Spinner from "./Spinner";

interface Props {
  submissionId: string;
  fileUrl: string | null;
  fileName: string | null;
  canUpload: boolean;
}

export default function ReportUploadCell({ submissionId, fileUrl, fileName, canUpload }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
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
          status: "submitted",
          submitted_by: user!.id,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
      if (updateErr) throw updateErr;

      setFile(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  if (!canUpload && !fileUrl) {
    return <span className="text-xs text-ink-dim">—</span>;
  }

  return (
    <div className="flex items-center gap-2">
      {fileUrl && (
        <a href={fileUrl} target="_blank" className="text-xs text-signal-amber hover:underline truncate max-w-[100px]">
          {fileName || "Lihat file"}
        </a>
      )}
      {canUpload && (
        <div className="flex items-center gap-1.5">
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs w-28 file:hidden text-ink-dim"
          />
          {file && (
            <ConfirmButton
              title="Kirim file ini sebagai laporan?"
              description={`File "${file.name}" akan disimpan sebagai laporan untuk wilayah ini.`}
              confirmLabel="Ya, kirim"
              onConfirm={handleUpload}
              className="text-xs text-signal-amber hover:underline flex items-center gap-1"
            >
              {uploading && <Spinner size={11} />} Kirim
            </ConfirmButton>
          )}
        </div>
      )}
      {error && <span className="text-xs text-signal-red">{error}</span>}
    </div>
  );
}
