import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { redirect, notFound } from "next/navigation";

async function updateReportTemplate(formData: FormData) {
  "use server";
  const supabase = createClient();
  const id = formData.get("id") as string;

  const { error } = await supabase
    .from("report_templates")
    .update({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      period_month: Number(formData.get("period_month")),
      period_year: Number(formData.get("period_year")),
      deadline: formData.get("deadline") as string,
    })
    .eq("id", id);

  if (error) {
    redirect(`/reports/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/reports/${id}`);
}

export default async function EditReportPage({ params }: { params: { id: string } }) {
  const profile = await requireRole(["mdm", "rmdm"]);
  const supabase = createClient();

  const { data: template } = await supabase
    .from("report_templates")
    .select("id, name, description, period_month, period_year, deadline")
    .eq("id", params.id)
    .single();

  if (!template) notFound();

  const deadlineLocal = new Date(template.deadline);
  const deadlineValue = new Date(deadlineLocal.getTime() - deadlineLocal.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  return (
    <AppShell profile={profile}>
      <div className="max-w-xl mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Laporan Bulanan</p>
        <h1 className="font-display text-2xl font-bold mb-6">Edit Laporan</h1>

        <form action={updateReportTemplate} className="card space-y-4">
          <input type="hidden" name="id" value={template.id} />
          <div>
            <label className="text-sm text-ink-dim block mb-1">Nama Laporan</label>
            <input name="name" required defaultValue={template.name} className="input-field" />
          </div>
          <div>
            <label className="text-sm text-ink-dim block mb-1">Deskripsi</label>
            <textarea name="description" rows={2} defaultValue={template.description ?? ""} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-ink-dim block mb-1">Bulan Periode</label>
              <select name="period_month" defaultValue={template.period_month} className="input-field">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-ink-dim block mb-1">Tahun Periode</label>
              <input type="number" name="period_year" defaultValue={template.period_year} className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-sm text-ink-dim block mb-1">Deadline Pengiriman</label>
            <input type="datetime-local" name="deadline" required defaultValue={deadlineValue} className="input-field" />
          </div>

          <ConfirmSubmitButton title="Simpan perubahan laporan ini?" className="btn-primary w-full">
            Simpan Perubahan
          </ConfirmSubmitButton>
        </form>
      </div>
    </AppShell>
  );
}
