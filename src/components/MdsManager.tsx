"use client";

import { useState } from "react";
import ConfirmButton from "./ConfirmButton";
import Spinner from "./Spinner";

interface Territory { id: string; code: string; name: string; region_id: string | null }
interface Region { id: string; code: string; name: string }
interface Mds {
  id: string;
  full_name: string;
  email: string;
  territory_id: string | null;
  territory_name: string;
  region_name: string;
}

export default function MdsManager({
  mdsList: initialMdsList,
  regions,
  territories,
  fixedRegionId,
}: {
  mdsList: Mds[];
  regions: Region[];
  territories: Territory[];
  fixedRegionId?: string;
}) {
  const [mdsList, setMdsList] = useState(initialMdsList);
  const [regionId, setRegionId] = useState(fixedRegionId ?? "");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignedTerritoryIds = new Set(mdsList.map((m) => m.territory_id).filter(Boolean));
  const availableTerritories = territories.filter(
    (t) => t.region_id === regionId && !assignedTerritoryIds.has(t.id)
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const form = new FormData(e.currentTarget);

    const territoryId = form.get("territory_id") as string;
    const territory = territories.find((t) => t.id === territoryId);
    const region = regions.find((r) => r.id === regionId);
    const fullName = form.get("full_name") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, password, full_name: fullName, role: "mds",
          region_id: regionId, territory_id: territoryId,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setMdsList((prev) => [
        ...prev,
        {
          id: json.id, full_name: fullName, email,
          territory_id: territoryId,
          territory_name: territory?.name ?? "-",
          region_name: region?.name ?? "-",
        },
      ]);
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function handleDeleted(id: string) {
    setMdsList((prev) => prev.filter((m) => m.id !== id));
  }

  function handleUpdated(id: string, patch: Partial<Mds>) {
    setMdsList((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display font-semibold mb-3">Tambah MDS Baru</h2>
        <p className="text-xs text-ink-dim mb-3">
          Pilih wilayah yang sudah ditugaskan ke region ini (lewat halaman Region &amp; Wilayah), lalu buat akun login MDS.
        </p>
        <form onSubmit={handleCreate} className="card grid sm:grid-cols-2 gap-4">
          {!fixedRegionId && (
            <div>
              <label className="text-xs text-ink-dim block mb-1">Region</label>
              <select value={regionId} onChange={(e) => setRegionId(e.target.value)} required className="input-field">
                <option value="">Pilih region</option>
                {regions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-ink-dim block mb-1">Wilayah</label>
            <select name="territory_id" required className="input-field" disabled={!regionId}>
              <option value="">{regionId ? "Pilih wilayah" : "Pilih region dulu"}</option>
              {availableTerritories.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {regionId && availableTerritories.length === 0 && (
              <p className="text-xs text-ink-dim mt-1">
                Belum ada wilayah tersedia. Tugaskan wilayah ke region ini dulu di halaman Region &amp; Wilayah.
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-ink-dim block mb-1">Nama MDS</label>
            <input name="full_name" required className="input-field" />
          </div>
          <div>
            <label className="text-xs text-ink-dim block mb-1">Email Login</label>
            <input name="email" type="email" required className="input-field" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-ink-dim block mb-1">Password Login</label>
            <input name="password" type="text" required minLength={6} placeholder="Minimal 6 karakter" className="input-field" />
          </div>
          {error && <p className="text-signal-red text-sm sm:col-span-2">{error}</p>}
          <button disabled={creating} className="btn-primary sm:col-span-2 flex items-center justify-center gap-2">
            {creating && <Spinner size={14} />} Buat MDS
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display font-semibold mb-3">Daftar MDS</h2>
        <div className="space-y-3">
          {mdsList.length === 0 && <p className="text-ink-dim text-sm">Belum ada MDS dibuat.</p>}
          {mdsList.map((m) => (
            <MdsRow
              key={m.id}
              mds={m}
              options={territories.filter(
                (t) => !assignedTerritoryIds.has(t.id) || t.id === m.territory_id
              )}
              onDeleted={() => handleDeleted(m.id)}
              onUpdated={(patch) => handleUpdated(m.id, patch)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function MdsRow({
  mds,
  options,
  onDeleted,
  onUpdated,
}: {
  mds: Mds;
  options: Territory[];
  onDeleted: () => void;
  onUpdated: (patch: Partial<Mds>) => void;
}) {
  const [showPw, setShowPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [territoryId, setTerritoryId] = useState(mds.territory_id ?? "");
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(mds.full_name);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveName() {
    setSavingName(true);
    const res = await fetch(`/api/admin/users/${mds.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name }),
    });
    const json = await res.json();
    setSavingName(false);
    if (json.ok) { setEditingName(false); onUpdated({ full_name: name }); }
    else setError(json.error);
  }

  async function handleReassign() {
    setSaving(true);
    const res = await fetch(`/api/admin/users/${mds.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ territory_id: territoryId }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.ok) {
      const territory = options.find((t) => t.id === territoryId);
      onUpdated({ territory_id: territoryId, territory_name: territory?.name ?? mds.territory_name });
    } else {
      setError(json.error);
    }
  }

  async function handleResetPassword() {
    if (newPw.length < 6) { setError("Password minimal 6 karakter"); return; }
    setSaving(true);
    const res = await fetch(`/api/admin/users/${mds.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPw }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.ok) { setNewPw(""); setShowPw(false); }
    else setError(json.error);
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/users/${mds.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.ok) onDeleted();
    else setError(json.error);
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          {editingName ? (
            <div className="flex items-center gap-2 mb-1">
              <input value={name} onChange={(e) => setName(e.target.value)} className="input-field !py-1 text-sm w-48" />
              <button onClick={handleSaveName} disabled={savingName} className="text-signal-green text-xs">
                {savingName ? <Spinner size={12} /> : "Simpan"}
              </button>
              <button onClick={() => { setEditingName(false); setName(mds.full_name); }} className="text-ink-dim text-xs">Batal</button>
            </div>
          ) : (
            <p className="font-medium">
              {mds.full_name}{" "}
              <button onClick={() => setEditingName(true)} className="text-signal-amber text-xs hover:underline ml-1">Edit</button>
            </p>
          )}
          <p className="text-xs text-ink-dim">{mds.email}</p>
          <p className="text-xs text-ink-dim font-mono mt-1">{mds.territory_name} — {mds.region_name}</p>
        </div>
        <ConfirmButton
          title={`Hapus akun ${mds.full_name}?`}
          description="Akun MDS ini beserta Admin/TL di bawahnya tidak bisa login lagi. Data laporan yang sudah terkirim tetap tersimpan."
          confirmLabel="Ya, hapus"
          variant="danger"
          onConfirm={handleDelete}
          className="text-xs text-signal-red hover:underline"
        >
          Hapus Akun
        </ConfirmButton>
      </div>

      <div className="mt-4 pt-4 border-t border-base-line flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-ink-dim block mb-1">Pindah Wilayah</label>
          <select value={territoryId} onChange={(e) => setTerritoryId(e.target.value)} className="input-field !py-1.5 text-sm">
            {options.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <ConfirmButton
          title="Pindahkan wilayah MDS ini?"
          description="Pastikan wilayah baru belum ditempati MDS lain."
          confirmLabel="Ya, pindahkan"
          onConfirm={handleReassign}
          className="btn-secondary !py-1.5 text-sm"
        >
          {saving ? <Spinner size={12} /> : "Simpan"}
        </ConfirmButton>
      </div>

      <div className="mt-3 flex items-end gap-2">
        {showPw ? (
          <>
            <input
              type="text"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Password baru, minimal 6 karakter"
              className="input-field !py-1.5 text-sm flex-1"
            />
            <button onClick={handleResetPassword} disabled={saving} className="btn-secondary !py-1.5 text-sm flex items-center gap-2">
              {saving && <Spinner size={12} />} Simpan
            </button>
          </>
        ) : (
          <button onClick={() => setShowPw(true)} className="text-xs text-signal-amber hover:underline">
            Reset Password
          </button>
        )}
      </div>
      {error && <p className="text-signal-red text-xs mt-2">{error}</p>}
    </div>
  );
}
