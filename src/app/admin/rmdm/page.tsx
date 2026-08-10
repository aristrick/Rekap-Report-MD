import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import RmdmManager from "@/components/RmdmManager";

export default async function AdminRmdmPage() {
  const profile = await requireRole(["mdm"]);
  const supabase = createClient();

  const { data: rmdmProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, region_id, regions(code, name)")
    .eq("role", "rmdm")
    .order("full_name");

  const { data: territories } = await supabase
    .from("territories")
    .select("id, code, name, region_id")
    .order("name");

  const rmdmList = (rmdmProfiles ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email ?? "-",
    region_id: p.region_id,
    region_code: p.regions?.code ?? "-",
    region_name: p.regions?.name ?? "-",
  }));

  return (
    <AppShell profile={profile}>
      <div className="max-w-3xl mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Struktur Organisasi</p>
        <h1 className="font-display text-2xl font-bold mb-1">Kelola RMDM</h1>
        <p className="text-ink-dim text-sm mb-6">
          Setiap RMDM memegang satu region berisi beberapa wilayah. Menambah RMDM baru otomatis membuat region-nya juga.
        </p>
        <RmdmManager rmdmList={rmdmList} territories={territories ?? []} />
      </div>
    </AppShell>
  );
}
