"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ConfirmButton from "./ConfirmButton";
import Spinner from "./Spinner";

interface Territory { id: string; code: string; name: string; region_id: string }
interface Rmdm {
  id: string;
  full_name: string;
  email: string;
  region_id: string | null;
  region_code: string;
  region_name: string;
}

export default function RmdmManager({ rmdmList, territories }: { rmdmList: Rmdm[]; territories: Territory[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    const form = new FormData(e.currentTarget);

    const regionCode = (form.get("region_code") as string).trim();
    const regionName = (form.get("region_name") as string).trim();
    const fullName = form.get("full_name") as string;
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    try {
      const { data: region, error: regionErr } = await supabase
        .from("regions")
        .insert({ code: regionCode, name: regionName })
        .select("id")
        .single();
      if (regionErr || !region) throw new Error(regionErr?.message ?? "Gagal membuat region");

      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName, role: "rmdm", region_id: region.id }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);

      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display font-semibold mb-3">Tambah RMDM Baru</h2>
        <p className="text-xs text-ink-dim mb-3">
          Ini akan membuat region baru sekaligus akun login untuk RMDM-nya dalam satu langkah.
        </p>
        <form onSubmit={handleCreate} className="card grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-ink-dim block mb-1">Kode Region</label>
            <input name="region_code" required placeholder="RMDM31" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-ink-dim block mb-1">Nama Region</label>
            <input name="region_name" required placeholder="Region 31 - Jakarta Timur" className="input-field" />
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
          <button disabled={creating} className="btn-primary sm:col-span-2 flex items-center justify-center gap-2">
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
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function RmdmCard({ rmdm, territories }: { rmdm: Rmdm; territories: Territory[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [showAddTerritory, setShowAddTerritory] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAddTerritory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = (form.get("code") as string).trim();
    const name = (form.get("name") as string).trim();
    const { error } = await supabase.from("territories").insert({ region_id: rmdm.region_id, code, name });
    if (!error) {
      (e.target as HTMLFormElement).reset();
      setShowAddTerritory(false);
      router.refresh();
    } else {
      setError(error.message);
    }
  }

  async function handleRemoveTerritory(id: string) {
    await supabase.from("territories").delete().eq("id", id);
    router.refresh();
  }

  async function handleDeleteRmdm() {
    const res = await fetch(`/api/admin/users/${rmdm.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.ok) router.refresh();
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
    if (json.ok) setNewPw("");
    else setError(json.error);
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="font-medium">{rmdm.full_name}</p>
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
        <div className="flex flex-wrap gap-2 mb-3">
          {territories.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-1.5 text-xs bg-base border border-base-line rounded-sm px-2 py-1">
              {t.name}
              <ConfirmButton
                title={`Hapus wilayah ${t.name}?`}
                description="Wilayah ini beserta data laporan/realisasi di dalamnya akan ikut terhapus."
                confirmLabel="Ya, hapus"
                variant="danger"
                onConfirm={() => handleRemoveTerritory(t.id)}
                className="text-signal-red hover:text-signal-red/70"
              >
                ×
              </ConfirmButton>
            </span>
          ))}
          {territories.length === 0 && <span className="text-xs text-ink-dim">Belum ada wilayah</span>}
        </div>

        {showAddTerritory ? (
          <form onSubmit={handleAddTerritory} className="flex gap-2 items-end">
            <div>
              <label className="text-xs text-ink-dim block mb-1">Kode</label>
              <input name="code" required placeholder="BOGOR" className="input-field !py-1.5 text-sm w-28" />
            </div>
            <div>
              <label className="text-xs text-ink-dim block mb-1">Nama</label>
              <input name="name" required placeholder="Bogor" className="input-field !py-1.5 text-sm w-40" />
            </div>
            <button className="btn-primary !py-1.5 text-sm">Tambah</button>
            <button type="button" onClick={() => setShowAddTerritory(false)} className="btn-secondary !py-1.5 text-sm">Batal</button>
          </form>
        ) : (
          <button onClick={() => setShowAddTerritory(true)} className="text-xs text-signal-amber hover:underline">
            + Tambah wilayah
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-base-line flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs text-ink-dim block mb-1">Reset Password</label>
          <input
            type="text"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="Password baru, minimal 6 karakter"
            className="input-field !py-1.5 text-sm"
          />
        </div>
        <button onClick={handleResetPassword} disabled={savingPw} className="btn-secondary !py-1.5 text-sm flex items-center gap-2">
          {savingPw && <Spinner size={12} />} Simpan
        </button>
      </div>
      {error && <p className="text-signal-red text-xs mt-2">{error}</p>}
    </div>
  );
}
