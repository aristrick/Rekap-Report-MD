"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Spinner from "./Spinner";

type Role = "mdm" | "rmdm" | "mds";

interface Option { id: string; label: string }

const TIER_CONFIG: Record<Role, { level: "region" | "territory" | "person"; noun: string; allLabel: string }> = {
  mdm: { level: "region", noun: "RMDM", allLabel: "Semua RMDM" },
  rmdm: { level: "territory", noun: "MDS", allLabel: "Semua MDS" },
  mds: { level: "person", noun: "Admin/TL", allLabel: "Semua Admin/TL" },
};

export default function ReportForm({ role, options }: { role: Role; options: Option[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [scope, setScope] = useState<"all" | "specific">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = TIER_CONFIG[role];

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (scope === "specific" && selected.length === 0) {
      setError(`Pilih minimal satu ${config.noun}.`);
      return;
    }

    setLoading(true);
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const description = form.get("description") as string;
    const period_month = Number(form.get("period_month"));
    const period_year = Number(form.get("period_year"));
    const deadline = form.get("deadline") as string;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: template, error: insertErr } = await supabase
        .from("report_templates")
        .insert({
          name, description, deadline, period_month, period_year,
          target_level: config.level,
          target_all: scope === "all",
          created_by: user!.id,
        })
        .select("id")
        .single();

      if (insertErr || !template) throw new Error(insertErr?.message ?? "Gagal membuat laporan");

      if (scope === "specific") {
        const columnKey = config.level === "region" ? "region_id" : config.level === "territory" ? "territory_id" : "profile_id";
        const rows = selected.map((id) => ({ template_id: template.id, [columnKey]: id }));
        const { error: targetErr } = await supabase.from("report_template_targets").insert(rows);
        if (targetErr) throw new Error(targetErr.message);
      }

      const { error: rpcErr } = await supabase.rpc("generate_report_submissions", { p_template_id: template.id });
      if (rpcErr) throw new Error(rpcErr.message);

      router.push(`/reports/${template.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  const now = new Date();

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="text-sm text-ink-dim block mb-1">Nama Laporan</label>
        <input name="name" required className="input-field" placeholder="Contoh: Laporan Kunjungan Toko" />
      </div>
      <div>
        <label className="text-sm text-ink-dim block mb-1">Deskripsi (opsional)</label>
        <textarea name="description" className="input-field" rows={2} />
      </div>

      <div>
        <label className="text-sm text-ink-dim block mb-2">Ditugaskan ke</label>
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={scope === "all"} onChange={() => setScope("all")} className="accent-signal-amber" />
            {config.allLabel}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={scope === "specific"} onChange={() => setScope("specific")} className="accent-signal-amber" />
            {config.noun} Tertentu
          </label>
        </div>
        {scope === "specific" && (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-base-line rounded p-3">
            {options.length === 0 && <p className="text-xs text-ink-dim col-span-2">Belum ada {config.noun} yang bisa dipilih.</p>}
            {options.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="accent-signal-amber" />
                {o.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-ink-dim block mb-1">Bulan Periode</label>
          <select name="period_month" defaultValue={now.getMonth() + 1} className="input-field">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-ink-dim block mb-1">Tahun Periode</label>
          <input type="number" name="period_year" defaultValue={now.getFullYear()} className="input-field" />
        </div>
      </div>

      <div>
        <label className="text-sm text-ink-dim block mb-1">Deadline Pengiriman</label>
        <input type="datetime-local" name="deadline" required className="input-field" />
      </div>

      {error && <p className="text-signal-red text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        {loading && <Spinner size={14} />} {loading ? "Menyimpan..." : "Buat & Kirim Tugas"}
      </button>
      <p className="text-xs text-ink-dim">
        {config.noun} akan mendapat pengingat lewat Telegram, dan bisa upload file (excel/PDF/Word/PPT/ZIP) langsung dari halaman ini.
      </p>
    </form>
  );
}
