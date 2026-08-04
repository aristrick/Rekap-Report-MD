import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import { redirect, notFound } from "next/navigation";

async function submitManually(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const templateId = formData.get("template_id") as string;
  const note = formData.get("note") as string;

  const { data: profile } = await supabase.from("profiles").select("territory_id").eq("id", user.id).single();
  if (!profile?.territory_id) redirect("/dashboard");

  await supabase
    .from("report_submissions")
    .update({ status: "submitted", submitted_by: user.id, submitted_at: new Date().toISOString(), note })
    .eq("template_id", templateId)
    .eq("territory_id", profile.territory_id);

  redirect(`/reports/${templateId}`);
}

export default async function ManualSubmitPage({ params }: { params: { id: string } }) {
  const profile = await requireProfile();
  const supabase = createClient();

  const { data: template } = await supabase
    .from("report_templates")
    .select("id, name")
    .eq("id", params.id)
    .single();

  if (!template) notFound();

  return (
    <div>
      <Navbar profile={profile} />
      <main className="max-w-md mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Kirim Manual</p>
        <h1 className="font-display text-2xl font-bold mb-1">{template.name}</h1>
        <p className="text-ink-dim text-sm mb-6">
          Cara utama pengiriman adalah lewat group Telegram wilayah kamu — kirim file di sana dan
          statusnya otomatis terupdate. Gunakan form ini hanya sebagai cadangan.
        </p>

        <form action={submitManually} className="card space-y-4">
          <input type="hidden" name="template_id" value={template.id} />
          <div>
            <label className="text-sm text-ink-dim block mb-1">Catatan / link file</label>
            <textarea name="note" required rows={3} className="input-field" placeholder="Contoh: sudah dikirim manual ke RMDM lewat WA, link drive: ..." />
          </div>
          <button type="submit" className="btn-primary w-full">Tandai Sudah Dikirim</button>
        </form>
      </main>
    </div>
  );
}
