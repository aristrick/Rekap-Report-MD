import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NAMA_BULAN } from "@/lib/telegram";

async function deleteProgram(formData: FormData) {
  "use server";
  const supabase = createClient();
  await supabase.from("programs").delete().eq("id", formData.get("id") as string);
  redirect("/programs");
}

export default async function ProgramsPage() {
  const profile = await requireProfile();
  const supabase = createClient();
  const canManage = profile.role === "mdm" || profile.role === "rmdm";

  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, period_month, period_year, regions(name), program_realizations(status)")
    .order("created_at", { ascending: false });

  return (
    <AppShell profile={profile}>
      <div className="max-w-6xl mx-auto px-5 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="label-eyebrow mb-1">Program</p>
            <h1 className="font-display text-2xl font-bold">Daftar Program</h1>
          </div>
          {canManage && (
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
              <div key={p.id} className="card flex items-center justify-between hover:border-signal-amber/50 transition">
                <Link href={`/programs/${p.id}`} className="flex-1 min-w-0">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-ink-dim mt-1 font-mono">
                    {NAMA_BULAN[p.period_month - 1]} {p.period_year} · {p.regions?.name}
                  </p>
                </Link>
                <div className="flex items-center gap-4">
                  <Link href={`/programs/${p.id}`} className="text-right block">
                    <p className="font-display text-xl font-bold">{done}/{reals.length}</p>
                    <p className="text-xs text-ink-dim">wilayah selesai</p>
                  </Link>
                  {canManage && (
                    <div className="flex flex-col gap-1 items-end">
                      <Link href={`/programs/${p.id}/edit`} className="text-xs text-signal-amber hover:underline">Edit</Link>
                      <form action={deleteProgram}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmSubmitButton
                          title={`Hapus program "${p.name}"?`}
                          description="Semua data realisasi untuk program ini juga akan ikut terhapus. Tindakan ini permanen."
                          variant="danger"
                          className="text-xs text-signal-red hover:underline"
                        >
                          Hapus
                        </ConfirmSubmitButton>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
