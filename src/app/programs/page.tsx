import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { NAMA_BULAN } from "@/lib/telegram";

export default async function ProgramsPage() {
  const profile = await requireProfile();
  const supabase = createClient();
  const canCreate = profile.role === "mdm" || profile.role === "rmdm";

  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, period_month, period_year, regions(name), program_realizations(status)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <Navbar profile={profile} />
      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="label-eyebrow mb-1">Program</p>
            <h1 className="font-display text-2xl font-bold">Daftar Program</h1>
          </div>
          {canCreate && (
            <Link href="/programs/new" className="btn-primary">+ Buat Program Baru</Link>
          )}
        </div>

        <div className="grid gap-3">
          {(programs ?? []).length === 0 && (
            <p className="text-ink-dim text-sm">Belum ada program dibuat.</p>
          )}
          {(programs ?? []).map((p: any) => {
            const reals = p.program_realizations ?? [];
            const done = reals.filter((r: any) => r.status === "submitted" || r.status === "approved").length;
            return (
              <Link key={p.id} href={`/programs/${p.id}`} className="card flex items-center justify-between hover:border-signal-amber/50 transition">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-ink-dim mt-1 font-mono">
                    {NAMA_BULAN[p.period_month - 1]} {p.period_year} · {p.regions?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold">{done}/{reals.length}</p>
                  <p className="text-xs text-ink-dim">wilayah selesai</p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
