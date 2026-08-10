"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmButton from "./ConfirmButton";
import Spinner from "./Spinner";

interface Member {
  id: string;
  full_name: string;
  role: "admin" | "tl";
  is_active: boolean;
}

export default function SubordinateList({ members }: { members: Member[] }) {
  return (
    <div className="card divide-y divide-base-line">
      {members.length === 0 && <p className="text-ink-dim text-sm py-2">Belum ada Admin/TL dibuat.</p>}
      {members.map((m) => (
        <MemberRow key={m.id} member={m} />
      ))}
    </div>
  );
}

function MemberRow({ member }: { member: Member }) {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const res = await fetch(`/api/admin/users/${member.id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.ok) router.refresh();
    else setError(json.error);
  }

  async function handleResetPassword() {
    if (newPw.length < 6) { setError("Password minimal 6 karakter"); return; }
    setSaving(true);
    const res = await fetch(`/api/admin/users/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPw }),
    });
    const json = await res.json();
    setSaving(false);
    if (json.ok) { setNewPw(""); setShowPw(false); }
    else setError(json.error);
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">{member.full_name}</p>
          <p className="text-xs text-ink-dim font-mono">{member.role === "admin" ? "Admin" : "Team Leader"}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowPw((v) => !v)} className="text-xs text-signal-amber hover:underline">
            Reset Password
          </button>
          <ConfirmButton
            title={`Hapus akun ${member.full_name}?`}
            description="Akun ini akan dihapus permanen dan tidak bisa login lagi."
            confirmLabel="Ya, hapus"
            variant="danger"
            onConfirm={handleDelete}
            className="text-xs text-signal-red hover:underline"
          >
            Hapus
          </ConfirmButton>
        </div>
      </div>
      {showPw && (
        <div className="flex items-end gap-2 mt-3">
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
        </div>
      )}
      {error && <p className="text-signal-red text-xs mt-2">{error}</p>}
    </div>
  );
}
