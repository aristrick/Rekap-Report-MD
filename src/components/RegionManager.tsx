"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConfirmButton from "./ConfirmButton";
import Spinner from "./Spinner";

interface Region { id: string; code: string; name: string }
interface Territory { id: string; code: string; name: string; region_id: string }

export default function RegionManager({ regions, territories }: { regions: Region[]; territories: Territory[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateRegion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from("regions").insert({
      code: form.get("code"),
      name: form.get("name"),
    });
    setCreating(false);
    if (error) { setError(error.message); return; }
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display font-semibold mb-3">Tambah Region</h2>
        <form onSubmit={handleCreateRegion} className="card grid grid-cols-[140px_1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs text-ink-dim block mb-1">Kode</label>
            <input name="code" required placeholder="RMDM31" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-ink-dim block mb-1">Nama</label>
            <input name="name" required placeholder="Region 31 - Jakarta Timur" className="input-field" />
          </div>
          <button disabled={creating} className="btn-primary flex items-center gap-2">
            {creating && <Spinner size={14} />} Tambah
          </button>
        </form>
        {error && <p className="text-signal-red text-sm mt-2">{error}</p>}
      </section>

      <section>
        <h2 className="font-display font-semibold mb-3">Daftar Region &amp; Wilayah</h2>
        <div className="space-y-4">
          {regions.length === 0 && <p className="text-ink-dim text-sm">Belum ada region dibuat.</p>}
          {regions.map((r) => (
            <RegionCard key={r.id} region={r} territories={territories.filter((t) => t.region_id === r.id)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function RegionCard({ region, territories }: { region: Region; territories: Territory[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(region.name);
  const [code, setCode] = useState(region.code);
  const [showAddTerritory, setShowAddTerritory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveRegion() {
    const { error } = await supabase.from("regions").update({ name, code }).eq("id", region.id);
    if (error) { setError(error.message); return; }
    setEditing(false);
    router.refresh();
  }

  async function handleDeleteRegion() {
    const { error } = await supabase.from("regions").delete().eq("id", region.id);
    if (error) { setError(error.message); return; }
    router.refresh();
  }

  async function handleAddTerritory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from("territories").insert({
      region_id: region.id,
      code: form.get("code"),
      name: form.get("name"),
    });
    if (!error) {
      (e.target as HTMLFormElement).reset();
      setShowAddTerritory(false);
      router.refresh();
    } else {
      setError(error.message);
    }
  }

  async function handleDeleteTerritory(id: string) {
    await supabase.from("territories").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between flex-wrap gap-3">
        {editing ? (
          <div className="flex gap-2 flex-1">
            <input value={code} onChange={(e) => setCode(e.target.value)} className="input-field !py-1.5 text-sm w-28" />
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-field !py-1.5 text-sm flex-1" />
            <button onClick={handleSaveRegion} className="btn-primary !py-1.5 text-sm">Simpan</button>
            <button onClick={() => setEditing(false)} className="btn-secondary !py-1.5 text-sm">Batal</button>
          </div>
        ) : (
          <div>
            <p className="font-medium">{region.code} — {region.name}</p>
          </div>
        )}
        {!editing && (
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(true)} className="text-xs text-signal-amber hover:underline">Edit</button>
            <ConfirmButton
              title={`Hapus region ${region.name}?`}
              description="Semua wilayah, RMDM, MDS, dan data di bawah region ini juga akan ikut terhapus. Tindakan ini permanen."
              confirmLabel="Ya, hapus"
              variant="danger"
              onConfirm={handleDeleteRegion}
              className="text-xs text-signal-red hover:underline"
            >
              Hapus
            </ConfirmButton>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-base-line">
        <p className="text-xs text-ink-dim mb-2">Wilayah ({territories.length})</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {territories.map((t) => (
            <TerritoryChip key={t.id} territory={t} onDelete={() => handleDeleteTerritory(t.id)} />
          ))}
          {territories.length === 0 && <span className="text-xs text-ink-dim">Belum ada wilayah</span>}
        </div>

        {showAddTerritory ? (
          <form onSubmit={handleAddTerritory} className="flex gap-2 items-end">
            <input name="code" required placeholder="BOGOR" className="input-field !py-1.5 text-sm w-28" />
            <input name="name" required placeholder="Bogor" className="input-field !py-1.5 text-sm w-40" />
            <button className="btn-primary !py-1.5 text-sm">Tambah</button>
            <button type="button" onClick={() => setShowAddTerritory(false)} className="btn-secondary !py-1.5 text-sm">Batal</button>
          </form>
        ) : (
          <button onClick={() => setShowAddTerritory(true)} className="text-xs text-signal-amber hover:underline">
            + Tambah wilayah
          </button>
        )}
      </div>
      {error && <p className="text-signal-red text-xs mt-2">{error}</p>}
    </div>
  );
}

function TerritoryChip({ territory, onDelete }: { territory: Territory; onDelete: () => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(territory.name);

  async function handleSave() {
    await supabase.from("territories").update({ name }).eq("id", territory.id);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-base border border-base-line rounded-sm px-2 py-1">
        <input value={name} onChange={(e) => setName(e.target.value)} className="bg-transparent border-b border-signal-amber text-xs w-24 focus:outline-none" />
        <button onClick={handleSave} className="text-signal-green">✓</button>
        <button onClick={() => setEditing(false)} className="text-ink-dim">×</button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs bg-base border border-base-line rounded-sm px-2 py-1">
      {territory.name}
      <button onClick={() => setEditing(true)} className="text-signal-amber hover:text-signal-amber/70">✎</button>
      <ConfirmButton
        title={`Hapus wilayah ${territory.name}?`}
        description="Wilayah ini beserta data laporan/realisasi/MDS di dalamnya akan ikut terhapus."
        confirmLabel="Ya, hapus"
        variant="danger"
        onConfirm={onDelete}
        className="text-signal-red hover:text-signal-red/70"
      >
        ×
      </ConfirmButton>
    </span>
  );
}
