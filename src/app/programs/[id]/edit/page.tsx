import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { redirect, notFound } from "next/navigation";

async function updateProgram(formData: FormData) {
  "use server";
  const supabase = createClient();
  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("programs")
    .update({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      period_month: Number(formData.get("period_month")),
      period_year: Number(formData.get("period_year")),
    })
    .eq("id", id);

  if (error) {
    redirect(`/programs/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/programs/${id}`);
}

export default async function EditProgramPage({ params }: { params: { id: string } }) {
  const profile = await requireRole(["mdm", "rmdm"]);
  const supabase = createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("id, name, description, period_month, period_year")
    .eq("id", params.id)
    .single();

  if (!program) notFound();

  return (
    <AppShell profile={profile}>
      <div className="max-w-xl mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Program</p>
        <h1 className="font-display text-2xl font-bold mb-6">Edit Program</h1>

        <form action={updateProgram} className="card space-y-4">
          <input type="hidden" name="id" value={program.id} />
          <div>
            <label className="text-sm text-ink-dim block mb-1">Nama Program</label>
            <input name="name" required defaultValue={program.name} className="input-field" />
          </div>
          <div>
            <label className="text-sm text-ink-dim block mb-1">Deskripsi</label>
            <textarea name="description" rows={2} defaultValue={program.description ?? ""} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-ink-dim block mb-1">Bulan Mulai</label>
              <select name="period_month" defaultValue={program.period_month} className="input-field">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-ink-dim block mb-1">Tahun</label>
              <input type="number" name="period_year" defaultValue={program.period_year} className="input-field" />
            </div>
          </div>

          <p className="text-xs text-ink-dim">
            Untuk mengubah wilayah pelaksana atau surat program, hapus program ini dan buat ulang.
          </p>

          <ConfirmSubmitButton title="Simpan perubahan program ini?" className="btn-primary w-full">
            Simpan Perubahan
          </ConfirmSubmitButton>
        </form>
      </div>
    </AppShell>
  );
}
