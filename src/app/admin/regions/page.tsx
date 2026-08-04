import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import { redirect } from "next/navigation";
import Link from "next/link";

async function createRegion(formData: FormData) {
  "use server";
  const supabase = createClient();
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  await supabase.from("regions").insert({ code, name });
  redirect("/admin/regions");
}

async function createTerritory(formData: FormData) {
  "use server";
  const supabase = createClient();
  const region_id = formData.get("region_id") as string;
  const code = formData.get("code") as string;
  const name = formData.get("name") as string;
  await supabase.from("territories").insert({ region_id, code, name });
  redirect("/admin/regions");
}

async function registerTelegramGroup(formData: FormData) {
  "use server";
  const supabase = createClient();
  const chat_id = formData.get("chat_id") as string;
  const label = formData.get("label") as string;
  const territory_id = (formData.get("territory_id") as string) || null;
  const region_id = (formData.get("region_id") as string) || null;
  await supabase.from("telegram_groups").insert({ chat_id, label, territory_id, region_id });
  redirect("/admin/regions");
}

export default async function AdminRegionsPage() {
  const profile = await requireRole(["mdm", "rmdm"]);
  const supabase = createClient();

  const { data: regions } = await supabase.from("regions").select("id, code, name").order("name");
  const { data: territories } = await supabase
    .from("territories")
    .select("id, code, name, region_id, regions(name)")
    .order("name");
  const { data: groups } = await supabase
    .from("telegram_groups")
    .select("id, chat_id, label, regions(name), territories(name)");

  return (
    <div>
      <Navbar profile={profile} />
      <main className="max-w-4xl mx-auto px-5 py-8 space-y-10">
        <div>
          <p className="label-eyebrow mb-1">Struktur Organisasi</p>
          <h1 className="font-display text-2xl font-bold">Kelola Wilayah</h1>
          <p className="text-ink-dim text-sm mt-1">
            Perlu bantuan mengelola user? Buka <Link href="/admin/users" className="text-signal-amber hover:underline">halaman Kelola User</Link>.
          </p>
        </div>

        {profile.role === "mdm" && (
          <section>
            <h2 className="font-display font-semibold mb-3">Tambah Region (RMDM)</h2>
            <form action={createRegion} className="card grid grid-cols-[120px_1fr_auto] gap-3 items-end">
              <div>
                <label className="text-xs text-ink-dim block mb-1">Kode</label>
                <input name="code" required placeholder="RMDM31" className="input-field" />
              </div>
              <div>
                <label className="text-xs text-ink-dim block mb-1">Nama</label>
                <input name="name" required placeholder="Region 31 - Jakarta Timur" className="input-field" />
              </div>
              <button className="btn-primary">Tambah</button>
            </form>
            <div className="mt-3 grid gap-2">
              {(regions ?? []).map((r) => (
                <div key={r.id} className="text-sm text-ink-dim font-mono">{r.code} — {r.name}</div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-display font-semibold mb-3">Tambah Wilayah (MDS)</h2>
          <form action={createTerritory} className="card grid grid-cols-[1fr_120px_1fr_auto] gap-3 items-end">
            {profile.role === "mdm" ? (
              <div>
                <label className="text-xs text-ink-dim block mb-1">Region</label>
                <select name="region_id" required className="input-field">
                  <option value="">Pilih region</option>
                  {(regions ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            ) : (
              <input type="hidden" name="region_id" value={profile.region_id ?? ""} />
            )}
            <div>
              <label className="text-xs text-ink-dim block mb-1">Kode</label>
              <input name="code" required placeholder="BOGOR" className="input-field" />
            </div>
            <div>
              <label className="text-xs text-ink-dim block mb-1">Nama</label>
              <input name="name" required placeholder="Bogor" className="input-field" />
            </div>
            <button className="btn-primary">Tambah</button>
          </form>
          <div className="mt-3 grid gap-2">
            {(territories ?? []).map((t: any) => (
              <div key={t.id} className="text-sm text-ink-dim font-mono">
                {t.code} — {t.name} <span className="text-ink-dim/60">({t.regions?.name})</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display font-semibold mb-3">Daftarkan Group Telegram</h2>
          <p className="text-xs text-ink-dim mb-3">
            Chat ID didapat dengan menambahkan bot ke group, lalu buka
            <code className="bg-base-line px-1 mx-1 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>
            setelah kirim pesan apa saja di group tersebut. Lihat README bagian "Cara mendapatkan Chat ID".
          </p>
          <form action={registerTelegramGroup} className="card grid grid-cols-2 gap-3">
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
            <button className="btn-primary col-span-2">Daftarkan Group</button>
          </form>
          <div className="mt-3 grid gap-2">
            {(groups ?? []).map((g: any) => (
              <div key={g.id} className="text-sm text-ink-dim font-mono">
                {g.label} — {g.chat_id} {g.territories?.name ? `(${g.territories.name})` : g.regions?.name ? `(${g.regions.name})` : ""}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
