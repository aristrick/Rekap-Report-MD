import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { redirect } from "next/navigation";

async function registerTelegramGroup(formData: FormData) {
  "use server";
  const supabase = createClient();
  const chat_id = formData.get("chat_id") as string;
  const label = formData.get("label") as string;
  const territory_id = (formData.get("territory_id") as string) || null;
  const region_id = (formData.get("region_id") as string) || null;
  await supabase.from("telegram_groups").insert({ chat_id, label, territory_id, region_id });
  redirect("/admin/telegram");
}

async function deleteTelegramGroup(formData: FormData) {
  "use server";
  const supabase = createClient();
  await supabase.from("telegram_groups").delete().eq("id", formData.get("id") as string);
  redirect("/admin/telegram");
}

export default async function AdminTelegramPage() {
  const profile = await requireRole(["mdm", "rmdm"]);
  const supabase = createClient();

  const { data: regions } = await supabase.from("regions").select("id, name").order("name");
  const { data: territories } = await supabase.from("territories").select("id, name, region_id").order("name");
  const { data: groups } = await supabase
    .from("telegram_groups")
    .select("id, chat_id, label, regions(name), territories(name)");

  return (
    <AppShell profile={profile}>
      <div className="max-w-2xl mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Integrasi</p>
        <h1 className="font-display text-2xl font-bold mb-1">Group Telegram</h1>
        <p className="text-ink-dim text-sm mb-6">
          Chat ID didapat dengan menambahkan bot ke group, kirim pesan apa saja, lalu buka{" "}
          <code className="bg-base-line px-1 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>.
          Lihat tutorial bagian "Cara mendapatkan Chat ID" untuk detail lengkap.
        </p>

        <form action={registerTelegramGroup} className="card grid grid-cols-2 gap-3 mb-8">
          <div>
            <label className="text-xs text-ink-dim block mb-1">Chat ID</label>
            <input name="chat_id" required placeholder="-1001234567890" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-ink-dim block mb-1">Label</label>
            <input name="label" required placeholder="Group Wilayah Bogor" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-ink-dim block mb-1">Wilayah (jika group per wilayah)</label>
            <select name="territory_id" className="input-field">
              <option value="">- tidak ada -</option>
              {(territories ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-dim block mb-1">Region (jika group per region)</label>
            <select name="region_id" className="input-field">
              <option value="">- tidak ada -</option>
              {(regions ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <ConfirmSubmitButton
            title="Daftarkan group Telegram ini?"
            className="btn-primary col-span-2"
          >
            Daftarkan Group
          </ConfirmSubmitButton>
        </form>

        <div className="space-y-2">
          {(groups ?? []).map((g: any) => (
            <div key={g.id} className="card flex items-center justify-between !py-3">
              <div className="text-sm">
                <p>{g.label}</p>
                <p className="text-xs text-ink-dim font-mono">
                  {g.chat_id} {g.territories?.name ? `· ${g.territories.name}` : g.regions?.name ? `· ${g.regions.name}` : ""}
                </p>
              </div>
              <form action={deleteTelegramGroup}>
                <input type="hidden" name="id" value={g.id} />
                <ConfirmSubmitButton
                  title="Hapus group ini dari daftar?"
                  description="Bot tidak akan lagi mengenali kiriman file dari group ini."
                  variant="danger"
                  className="text-xs text-signal-red hover:underline"
                >
                  Hapus
                </ConfirmSubmitButton>
              </form>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
