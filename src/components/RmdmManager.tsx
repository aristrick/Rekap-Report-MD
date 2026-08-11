"use client";

import { useState } from "react";
import Spinner from "./Spinner";
import ConfirmButton from "./ConfirmButton";

interface Territory { id: string; code: string; name: string; region_id: string | null }
interface Region { id: string; code: string; name: string }
interface Rmdm {
  id: string;
  full_name: string;
  email: string;
  region_id: string | null;
  region_code: string;
  region_name: string;
}

export default function RmdmManager({
  rmdmList: initialRmdmList,
  territories,
  availableRegions,
}: {
  rmdmList: Rmdm[];
  territories: Territory[];
  availableRegions: Region[]; // region yang belum punya RMDM
}) {
  const [rmdmList, setRmdmList] = useState(initialRmdmList);
  const [regionsLeft, setRegionsLeft] = useState(availableRegions);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const form = new FormData(e.currentTarget);

    const regionId = form.get("region_id") as string;
    const region = regionsLeft.find((r) => r.id === regionId);
    const fullName = form.get("full_name") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    if (!region) { setError("Pilih region terlebih dahulu."); setCreating(false); return; }

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName, role: "rmdm", region_id: regionId }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      setRmdmList((prev) => [
        ...prev,
        { id: json.id, full_name: fullName, email, region_id: regionId, region_code: region.code, region_name: region.name },
      ]);
      setRegionsLeft((prev) => prev.filter((r) => r.id !== regionId));
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function handleDeleted(rmdm: Rmdm) {
    setRmdmList((prev) => prev.filter((r) => r.id !== rmdm.id));
    if (rmdm.region_id) {
      setRegionsLeft((prev) => [...prev, { id: rmdm.region_id!, code: rmdm.region_code, name: rmdm.region_name }]);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display font-semibold mb-3">Tambah RMDM Baru</h2>
        <p className="text-xs text-ink-dim mb-3">
          Pilih region yang sudah dibuat di halaman <span className="text-signal-amber">Region &amp; Wilayah</span>, lalu buat akun login RMDM untuk region itu.
        </p>
        <form onSubmit={handleCreate} className="card grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-ink-dim block mb-1">Region</label>
            <select name="region_id" required className="input-field" disabled={regionsLeft.length === 0}>
              <option value="">{regionsLeft.length === 0 ? "Semua region sudah punya RMDM" : "Pilih region"}</option>
              {regionsLeft.map((r) => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}
            </select>
            {regionsLeft.length === 0 && (
              <p className="text-xs text-ink-dim mt-1">
                Buat region baru dulu di halaman Region &amp; Wilayah.
              </p>
            )}
          </div>
          <div>
            <label className="text-xs text-ink-dim block mb-1">Nama RMDM</label>
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
          <button disabled={creating || regionsLeft.length === 0} className="btn-primary sm:col-span-2 flex items-center justify-center gap-2">
            {creating && <Spinner size={14} />} Buat RMDM
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display font-semibold mb-3">Daftar RMDM</h2>
        <div className="space-y-4">
          {rmdmList.length === 0 && <p className="text-ink-dim text-sm">Belum ada RMDM dibuat.</p>}
          {rmdmList.map((r) => (
            <RmdmCard
              key={r.id}
              rmdm={r}
              territories={territories.filter((t) => t.region_id === r.region_id)}
              onDeleted={() => handleDeleted(r)}
              setRmdmList={setRmdmList}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function RmdmCard({
  rmdm,
  territories,
  onDeleted,
  setRmdmList,
}: {
  rmdm: Rmdm;
  territories: Territory[];
  onDeleted: () => void;
  setRmdmList: React.Dispatch<React.SetStateAction<Rmdm[]>>;
}) {
  const [savingPw, setSavingPw] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(rmdm.full_name);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSaveName() {
    setSavingName(true);
    const res = await fetch(`/api/admin/users/${rmdm.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name: name }),
    });
    const json = await res.json();
    setSavingName(false);
    if (json.ok) {
      setEditingName(false);
      setRmdmList((prev) => prev.map((r) => (r.id === rmdm.id ? { ...r, full_name: name } : r)));
    } else {
      setError(json.error);
    }
  }

  async function handleDeleteRmdm() {
    const res = await fetch(`/api/admin/users/${rmdm.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.ok) onDeleted();
    else setError(json.error);
  }

  async function handleResetPassword() {
    if (newPw.length < 6) { setError("Password minimal 6 karakter"); return; }
    setSavingPw(true);
    const res = await fetch(`/api/admin/users/${rmdm.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPw }),
    });
    const json = await res.json();
    setSavingPw(false);
    if (json.ok) { setNewPw(""); setShowPw(false); }
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
              <button onClick={() => { setEditingName(false); setName(rmdm.full_name); }} className="text-ink-dim text-xs">Batal</button>
            </div>
          ) : (
            <p className="font-medium">
              {rmdm.full_name}{" "}
              <button onClick={() => setEditingName(true)} className="text-signal-amber text-xs hover:underline ml-1">Edit</button>
            </p>
          )}
          <p className="text-xs text-ink-dim">{rmdm.email}</p>
          <p className="text-xs text-ink-dim font-mono mt-1">{rmdm.region_code} — {rmdm.region_name}</p>
        </div>
        <ConfirmButton
          title={`Hapus akun ${rmdm.full_name}?`}
          description="Akun RMDM ini akan dihapus permanen dan tidak bisa login lagi. Region & wilayah di bawahnya tidak ikut terhapus."
          confirmLabel="Ya, hapus"
          variant="danger"
          onConfirm={handleDeleteRmdm}
          className="text-xs text-signal-red hover:underline"
        >
          Hapus Akun
        </ConfirmButton>
      </div>

      <div className="mt-4 pt-4 border-t border-base-line">
        <p className="text-xs text-ink-dim mb-2">Wilayah yang dicover ({territories.length})</p>
        <div className="flex flex-wrap gap-2">
          {territories.map((t) => (
            <span key={t.id} className="text-xs bg-base border border-base-line rounded-sm px-2 py-1">
              {t.name}
            </span>
          ))}
          {territories.length === 0 && <span className="text-xs text-ink-dim">Belum ada wilayah ditugaskan ke region ini</span>}
        </div>
        <p className="text-xs text-ink-dim mt-2">
          Tugaskan/lepas wilayah lewat halaman <a href="/admin/regions" className="text-signal-amber hover:underline">Region &amp; Wilayah</a>.
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-base-line">
        {showPw ? (
          <div className="flex items-end gap-2">
            <input
              type="text"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="Password baru, minimal 6 karakter"
              className="input-field !py-1.5 text-sm flex-1"
            />
            <button onClick={handleResetPassword} disabled={savingPw} className="btn-secondary !py-1.5 text-sm flex items-center gap-2">
              {savingPw && <Spinner size={12} />} Simpan
            </button>
          </div>
        ) : (
          <button onClick={() => setShowPw(true)} className="text-xs text-signal-amber hover:underline">Reset Password</button>
        )}
      </div>
      {error && <p className="text-signal-red text-xs mt-2">{error}</p>}
    </div>
  );
}
