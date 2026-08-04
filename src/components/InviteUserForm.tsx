"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  role: "mdm" | "rmdm" | "mds";
  regions: { id: string; name: string }[];
  territories: { id: string; name: string; region_id: string }[];
}

const ROLE_OPTIONS: Record<Props["role"], { value: string; label: string }[]> = {
  mdm: [{ value: "rmdm", label: "RMDM" }],
  rmdm: [{ value: "mds", label: "MDS" }],
  mds: [
    { value: "admin", label: "Admin" },
    { value: "tl", label: "Team Leader" },
  ],
};

export default function InviteUserForm({ role, regions, territories }: Props) {
  const router = useRouter();
  const [regionId, setRegionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const filteredTerritories = territories.filter((t) => !regionId || t.region_id === regionId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const form = new FormData(e.currentTarget);
    const payload = {
      email: form.get("email"),
      full_name: form.get("full_name"),
      role: form.get("role"),
      region_id: form.get("region_id") || undefined,
      territory_id: form.get("territory_id") || undefined,
    };

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();

    setLoading(false);
    if (!json.ok) {
      setError(json.error);
      return;
    }
    setSuccess(true);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <div>
        <label className="text-sm text-ink-dim block mb-1">Email</label>
        <input name="email" type="email" required className="input-field" placeholder="nama@perusahaan.com" />
      </div>
      <div>
        <label className="text-sm text-ink-dim block mb-1">Nama Lengkap</label>
        <input name="full_name" required className="input-field" />
      </div>
      <div>
        <label className="text-sm text-ink-dim block mb-1">Jabatan</label>
        <select name="role" required className="input-field">
          {ROLE_OPTIONS[role].map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {role === "mdm" && (
        <div>
          <label className="text-sm text-ink-dim block mb-1">Region</label>
          <select name="region_id" required value={regionId} onChange={(e) => setRegionId(e.target.value)} className="input-field">
            <option value="">Pilih region</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      )}

      {(role === "mdm" || role === "rmdm") && (
        <div>
          <label className="text-sm text-ink-dim block mb-1">Wilayah</label>
          <select name="territory_id" required value={regionId ? undefined : undefined} onChange={(e) => setRegionId(regionId)} className="input-field">
            <option value="">Pilih wilayah</option>
            {filteredTerritories.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      )}

      {error && <p className="text-signal-red text-sm">{error}</p>}
      {success && <p className="text-signal-green text-sm">Undangan berhasil dikirim ke email tersebut.</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Mengundang..." : "Kirim Undangan"}
      </button>
    </form>
  );
}
