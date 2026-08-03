"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  role: "mdm" | "rmdm" | "mds" | "admin" | "tl";
  regions: { id: string; name: string }[];
  fixedRegionId?: string;
}

export default function ProgramForm({ role, regions, fixedRegionId }: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [regionId, setRegionId] = useState(fixedRegionId ?? "");
  const [territories, setTerritories] = useState<{ id: string; name: string }[]>([]);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!regionId) {
      setTerritories([]);
      return;
    }
    supabase
      .from("territories")
      .select("id, name")
      .eq("region_id", regionId)
      .order("name")
      .then(({ data }) => setTerritories(data ?? []));
  }, [regionId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!regionId) return setError("Pilih region terlebih dahulu.");
    if (selectedTerritories.length === 0) return setError("Pilih minimal satu wilayah.");

    setLoading(true);
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const description = (form.elements.namedItem("description") as HTMLTextAreaElement).value;
    const period_month = Number((form.elements.namedItem("period_month") as HTMLSelectElement).value);
    const period_year = Number((form.elements.namedItem("period_year") as HTMLInputElement).value);

    let letter_file_url: string | null = null;
    if (file) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "surat-program");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadJson.ok) {
        setError(`Gagal upload surat program: ${uploadJson.error}`);
        setLoading(false);
        return;
      }
      letter_file_url = uploadJson.url;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: program, error: insertErr } = await supabase
      .from("programs")
      .insert({
        name, description, region_id: regionId,
        period_month, period_year, letter_file_url,
        created_by: user!.id,
      })
      .select("id")
      .single();

    if (insertErr || !program) {
      setError(insertErr?.message ?? "Gagal membuat program");
      setLoading(false);
      return;
    }

    const rows = selectedTerritories.map((tid) => ({ program_id: program.id, territory_id: tid }));
    const { error: relErr } = await supabase.from("program_territories").insert(rows);

    if (relErr) {
      setError(relErr.message);
      setLoading(false);
      return;
    }

    router.push(`/programs/${program.id}`);
  }

  function toggleTerritory(id: string) {
    setSelectedTerritories((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  const now = new Date();

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="text-sm text-ink-dim block mb-1">Nama Program</label>
        <input name="name" required className="input-field" placeholder="Contoh: Program Diskon Ramadan" />
      </div>
      <div>
        <label className="text-sm text-ink-dim block mb-1">Deskripsi</label>
        <textarea name="description" rows={2} className="input-field" />
      </div>

      {role === "mdm" ? (
        <div>
          <label className="text-sm text-ink-dim block mb-1">Region</label>
          <select value={regionId} onChange={(e) => setRegionId(e.target.value)} required className="input-field">
            <option value="">Pilih region</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-ink-dim block mb-1">Bulan Mulai</label>
          <select name="period_month" defaultValue={now.getMonth() + 1} className="input-field">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-ink-dim block mb-1">Tahun</label>
          <input type="number" name="period_year" defaultValue={now.getFullYear()} className="input-field" />
        </div>
      </div>

      <div>
        <label className="text-sm text-ink-dim block mb-1">Surat Program (PDF)</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="input-field file:mr-3 file:bg-base-line file:border-0 file:text-ink file:rounded file:px-3 file:py-1"
        />
      </div>

      <div>
        <label className="text-sm text-ink-dim block mb-2">Wilayah yang Menjalankan</label>
        {territories.length === 0 ? (
          <p className="text-xs text-ink-dim">Pilih region dulu untuk melihat daftar wilayah.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {territories.map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTerritories.includes(t.id)}
                  onChange={() => toggleTerritory(t.id)}
                  className="accent-signal-amber"
                />
                {t.name}
              </label>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-signal-red text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Menyimpan..." : "Buat Program"}
      </button>
    </form>
  );
}
