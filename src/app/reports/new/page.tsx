import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import { redirect } from "next/navigation";

async function createReportTemplate(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const region_id = formData.get("region_id") as string;
  const period_month = Number(formData.get("period_month"));
  const period_year = Number(formData.get("period_year"));
  const deadline = formData.get("deadline") as string;

  const { data, error } = await supabase
    .from("report_templates")
    .insert({ name, description, region_id, period_month, period_year, deadline, created_by: user.id })
    .select("id")
    .single();

  if (error) {
    redirect(`/reports/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/reports/${data!.id}`);
}

export default async function NewReportPage() {
  const profile = await requireRole(["mdm", "rmdm"]);
  const supabase = createClient();

  // MDM memilih region dari daftar; RMDM otomatis terkunci ke regionnya sendiri
  const { data: regions } = await supabase.from("regions").select("id, name").order("name");

  const now = new Date();

  return (
    <AppShell profile={profile}>
      <div className="max-w-xl mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Laporan Bulanan</p>
        <h1 className="font-display text-2xl font-bold mb-6">Buat Laporan Baru</h1>

        <form action={createReportTemplate} className="card space-y-4">
          <div>
            <label className="text-sm text-ink-dim block mb-1">Nama Laporan</label>
            <input name="name" required className="input-field" placeholder="Contoh: Laporan Kunjungan Toko" />
          </div>
          <div>
            <label className="text-sm text-ink-dim block mb-1">Deskripsi (opsional)</label>
            <textarea name="description" className="input-field" rows={2} />
          </div>

          {profile.role === "mdm" ? (
            <div>
              <label className="text-sm text-ink-dim block mb-1">Region</label>
              <select name="region_id" required className="input-field">
                <option value="">Pilih region</option>
                {(regions ?? []).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="region_id" value={profile.region_id ?? ""} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-ink-dim block mb-1">Bulan Periode</label>
              <select name="period_month" defaultValue={now.getMonth() + 1} className="input-field">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-ink-dim block mb-1">Tahun Periode</label>
              <input type="number" name="period_year" defaultValue={now.getFullYear()} className="input-field" />
            </div>
          </div>

          <div>
            <label className="text-sm text-ink-dim block mb-1">Deadline Pengiriman</label>
            <input type="datetime-local" name="deadline" required className="input-field" />
          </div>

          <button type="submit" className="btn-primary w-full">Buat & Kirim ke Semua Wilayah</button>
          <p className="text-xs text-ink-dim">
            Setelah dibuat, sistem otomatis membuat tugas pengiriman untuk setiap wilayah di region ini,
            dan bot Telegram akan mengumumkannya di group.
          </p>
        </form>
            </div>
    </AppShell>
  );
}
