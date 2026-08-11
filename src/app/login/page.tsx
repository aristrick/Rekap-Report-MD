"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SESSION_FLAG_KEY = "rekap_session_active";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("timeout") === "1") {
      setError("Sesi kamu berakhir karena 30 menit tidak ada aktivitas. Silakan masuk lagi.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Email atau password salah. Coba lagi.");
      setLoading(false);
      return;
    }

    // Tandai sesi ini aktif untuk tab/browser saat ini. sessionStorage otomatis
    // hilang saat tab/window ditutup, sehingga saat dibuka lagi wajib login ulang.
    sessionStorage.setItem(SESSION_FLAG_KEY, "1");

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="label-eyebrow mb-2">Sistem Pelaporan Lapangan</p>
          <h1 className="font-display text-3xl font-bold">Masuk ke akun</h1>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="text-sm text-ink-dim block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="nama@perusahaan.com"
            />
          </div>
          <div>
            <label className="text-sm text-ink-dim block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-signal-red text-sm">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="text-ink-dim text-xs text-center mt-6">
          Belum punya akun? Hubungi MDM atau RMDM kamu untuk didaftarkan.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
