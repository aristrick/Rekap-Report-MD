"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Spinner from "./Spinner";

interface Props {
  role: "mdm" | "rmdm" | "mds";
}

const ROLE_OPTIONS: Record<Props["role"], { value: string; label: string }[]> = {
  mdm: [],
  rmdm: [],
  mds: [
    { value: "admin", label: "Admin" },
    { value: "tl", label: "Team Leader" },
  ],
};

export default function AddSubordinateForm({ role }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const options = ROLE_OPTIONS[role];
  if (options.length === 0) return null; // MDM/RMDM sudah punya halaman khusus (Kelola RMDM / Kelola MDS)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const form = new FormData(e.currentTarget);
    const payload = {
      email: form.get("email"),
      password: form.get("password"),
      full_name: form.get("full_name"),
      role: form.get("role"),
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
        <label className="text-sm text-ink-dim block mb-1">Nama Lengkap</label>
        <input name="full_name" required className="input-field" />
      </div>
      <div>
        <label className="text-sm text-ink-dim block mb-1">Jabatan</label>
        <select name="role" required className="input-field">
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm text-ink-dim block mb-1">Email Login</label>
        <input name="email" type="email" required className="input-field" placeholder="nama@perusahaan.com" />
      </div>
      <div>
        <label className="text-sm text-ink-dim block mb-1">Password Login</label>
        <input name="password" type="text" required minLength={6} placeholder="Minimal 6 karakter" className="input-field" />
      </div>

      {error && <p className="text-signal-red text-sm">{error}</p>}
      {success && <p className="text-signal-green text-sm">Akun berhasil dibuat, bisa langsung login.</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
        {loading && <Spinner size={14} />} Buat Akun
      </button>
    </form>
  );
}
