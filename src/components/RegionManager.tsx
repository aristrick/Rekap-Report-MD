"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ConfirmButton from "./ConfirmButton";
import Spinner from "./Spinner";

interface Region { id: string; code: string; name: string }
interface Territory { id: string; code: string; name: string; address: string | null; region_id: string | null }

export default function RegionManager({
  regions: initialRegions,
  territories: initialTerritories,
}: {
  regions: Region[];
  territories: Territory[];
}) {
  const [regions, setRegions] = useState(initialRegions);
  const [territories, setTerritories] = useState(initialTerritories);

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8 items-start">
      <RegionColumn regions={regions} setRegions={setRegions} territories={territories} />
      <TerritoryColumn territories={territories} setTerritories={setTerritories} regions={regions} />
    </div>
  );
}

// =====================================================================
// KOLOM KIRI: Region
// =====================================================================
function RegionColumn({
  regions,
  setRegions,
  territories,
}: {
  regions: Region[];
  setRegions: React.Dispatch<React.SetStateAction<Region[]>>;
  territories: Territory[];
}) {
  const supabase = createClient();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateRegion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const code = form.get("code") as string;
    const name = form.get("name") as string;

    const { data, error } = await supabase.from("regions").insert({ code, name }).select().single();
    setCreating(false);
    if (error || !data) { setError(error?.message ?? "Gagal membuat region"); return; }

    setRegions((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    (e.target as HTMLFormElement).reset();
  }

  return (
    <section>
      <h2 className="font-display font-semibold mb-1">Region</h2>
      <p className="text-xs text-ink-dim mb-3">Region jadi acuan saat membuat akun RMDM.</p>

      <form onSubmit={handleCreateRegion} className="card grid grid-cols-[110px_1fr] gap-2 mb-4">
        <input name="code" required placeholder="RMDM31" className="input-field !py-1.5 text-sm" />
        <input name="name" required placeholder="Region 31 - Jakarta Timur" className="input-field !py-1.5 text-sm" />
        <button disabled={creating} className="btn-primary col-span-2 !py-1.5 text-sm flex items-center justify-center gap-2">
          {creating && <Spinner size={13} />} Tambah Region
        </button>
      </form>
      {error && <p className="text-signal-red text-xs mb-3">{error}</p>}

      <div className="space-y-2">
        {regions.length === 0 && <p className="text-ink-dim text-sm">Belum ada region.</p>}
        {regions.map((r) => (
          <RegionRow
            key={r.id}
            region={r}
            territoryCount={territories.filter((t) => t.region_id === r.id).length}
            setRegions={setRegions}
          />
        ))}
      </div>
    </section>
  );
}

function RegionRow({
  region,
  territoryCount,
  setRegions,
}: {
  region: Region;
  territoryCount: number;
  setRegions: React.Dispatch<React.SetStateAction<Region[]>>;
}) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(region.name);
  const [code, setCode] = useState(region.code);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const { error } = await supabase.from("regions").update({ name, code }).eq("id", region.id);
    if (error) { setError(error.message); return; }
    setRegions((prev) => prev.map((r) => (r.id === region.id ? { ...r, name, code } : r)));
    setEditing(false);
  }

  async function handleDelete() {
    const { error } = await supabase.from("regions").delete().eq("id", region.id);
    if (error) { setError(error.message); return; }
    setRegions((prev) => prev.filter((r) => r.id !== region.id));
  }

  if (editing) {
    return (
      <div className="card !py-2.5 flex gap-2 items-center">
        <input value={code} onChange={(e) => setCode(e.target.value)} className="input-field !py-1 text-sm w-24" />
        <input value={name} onChange={(e) => setName(e.target.value)} className="input-field !py-1 text-sm flex-1" />
        <button onClick={handleSave} className="text-signal-green text-xs">Simpan</button>
        <button onClick={() => setEditing(false)} className="text-ink-dim text-xs">Batal</button>
      </div>
    );
  }

  return (
    <div className="card !py-2.5 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{region.code} — {region.name}</p>
        <p className="text-xs text-ink-dim">{territoryCount} wilayah</p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => setEditing(true)} className="text-xs text-signal-amber hover:underline">Edit</button>
        <ConfirmButton
          title={`Hapus region ${region.name}?`}
          description="RMDM dan wilayah yang terhubung ke region ini perlu dipindahkan/dihapus manual dulu kalau ada."
          confirmLabel="Ya, hapus"
          variant="danger"
          onConfirm={handleDelete}
          className="text-xs text-signal-red hover:underline"
        >
          Hapus
        </ConfirmButton>
      </div>
      {error && <p className="text-signal-red text-xs mt-1">{error}</p>}
    </div>
  );
}

// =====================================================================
// KOLOM KANAN: Master Wilayah (kode cabang, nama cabang, alamat)
// =====================================================================
function TerritoryColumn({
  territories,
  setTerritories,
  regions,
}: {
  territories: Territory[];
  setTerritories: React.Dispatch<React.SetStateAction<Territory[]>>;
  regions: Region[];
}) {
  const supabase = createClient();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const code = form.get("code") as string;
    const name = form.get("name") as string;
    const address = form.get("address") as string;
    const region_id = (form.get("region_id") as string) || null;

    const { data, error } = await supabase
      .from("territories")
      .insert({ code, name, address, region_id })
      .select()
      .single();
    setCreating(false);
    if (error || !data) { setError(error?.message ?? "Gagal menambah wilayah"); return; }

    setTerritories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    (e.target as HTMLFormElement).reset();
  }

  return (
    <section>
      <h2 className="font-display font-semibold mb-1">Master Data Wilayah / Cabang</h2>
      <p className="text-xs text-ink-dim mb-3">
        Data ini jadi acuan saat menambahkan wilayah untuk RMDM dan menugaskan MDS.
      </p>

      <form onSubmit={handleCreate} className="card grid grid-cols-2 gap-2 mb-4">
        <input name="code" required placeholder="Kode cabang (BOGOR)" className="input-field !py-1.5 text-sm" />
        <input name="name" required placeholder="Nama cabang (Bogor)" className="input-field !py-1.5 text-sm" />
        <input name="address" placeholder="Alamat" className="input-field !py-1.5 text-sm col-span-2" />
        <select name="region_id" className="input-field !py-1.5 text-sm col-span-2">
          <option value="">- Belum ditugaskan ke region -</option>
          {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button disabled={creating} className="btn-primary col-span-2 !py-1.5 text-sm flex items-center justify-center gap-2">
          {creating && <Spinner size={13} />} Tambah Wilayah
        </button>
      </form>
      {error && <p className="text-signal-red text-xs mb-3">{error}</p>}

      <div className="card !p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink-dim border-b border-base-line bg-base">
              <th className="px-3 py-2 font-normal">Kode</th>
              <th className="px-3 py-2 font-normal">Nama</th>
              <th className="px-3 py-2 font-normal">Region</th>
              <th className="px-3 py-2 font-normal"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-line">
            {territories.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-ink-dim text-xs">Belum ada wilayah.</td></tr>
            )}
            {territories.map((t) => (
              <TerritoryRow key={t.id} territory={t} regions={regions} setTerritories={setTerritories} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TerritoryRow({
  territory,
  regions,
  setTerritories,
}: {
  territory: Territory;
  regions: Region[];
  setTerritories: React.Dispatch<React.SetStateAction<Territory[]>>;
}) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(territory.code);
  const [name, setName] = useState(territory.name);
  const [address, setAddress] = useState(territory.address ?? "");
  const [regionId, setRegionId] = useState(territory.region_id ?? "");
  const [error, setError] = useState<string | null>(null);

  const regionName = regions.find((r) => r.id === territory.region_id)?.name ?? "-";

  async function handleSave() {
    const { error } = await supabase
      .from("territories")
      .update({ code, name, address, region_id: regionId || null })
      .eq("id", territory.id);
    if (error) { setError(error.message); return; }
    setTerritories((prev) =>
      prev.map((t) => (t.id === territory.id ? { ...t, code, name, address, region_id: regionId || null } : t))
    );
    setEditing(false);
  }

  async function handleDelete() {
    const { error } = await supabase.from("territories").delete().eq("id", territory.id);
    if (error) { setError(error.message); return; }
    setTerritories((prev) => prev.filter((t) => t.id !== territory.id));
  }

  if (editing) {
    return (
      <tr className="bg-base">
        <td className="px-3 py-2"><input value={code} onChange={(e) => setCode(e.target.value)} className="input-field !py-1 text-xs w-20" /></td>
        <td className="px-3 py-2"><input value={name} onChange={(e) => setName(e.target.value)} className="input-field !py-1 text-xs w-28" /></td>
        <td className="px-3 py-2">
          <select value={regionId} onChange={(e) => setRegionId(e.target.value)} className="input-field !py-1 text-xs">
            <option value="">- tidak ada -</option>
            {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          <button onClick={handleSave} className="text-signal-green text-xs mr-2">Simpan</button>
          <button onClick={() => setEditing(false)} className="text-ink-dim text-xs">Batal</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-3 py-2 font-mono text-xs">{territory.code}</td>
      <td className="px-3 py-2">
        {territory.name}
        {territory.address && <p className="text-xs text-ink-dim">{territory.address}</p>}
      </td>
      <td className="px-3 py-2 text-ink-dim text-xs">{regionName}</td>
      <td className="px-3 py-2 whitespace-nowrap text-right">
        <button onClick={() => setEditing(true)} className="text-signal-amber text-xs hover:underline mr-2">Edit</button>
        <ConfirmButton
          title={`Hapus wilayah ${territory.name}?`}
          description="Wilayah ini beserta data laporan/realisasi/MDS di dalamnya akan ikut terhapus."
          confirmLabel="Ya, hapus"
          variant="danger"
          onConfirm={handleDelete}
          className="text-signal-red text-xs hover:underline"
        >
          Hapus
        </ConfirmButton>
        {error && <p className="text-signal-red text-xs mt-1">{error}</p>}
      </td>
    </tr>
  );
}
