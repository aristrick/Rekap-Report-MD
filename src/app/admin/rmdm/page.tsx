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

  const { data: allRegions } = await supabase.from("regions").select("id, code, name").order("name");

  const rmdmList = (rmdmProfiles ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email ?? "-",
    region_id: p.region_id,
    region_code: p.regions?.code ?? "-",
    region_name: p.regions?.name ?? "-",
  }));

  const takenRegionIds = new Set(rmdmList.map((r) => r.region_id).filter(Boolean));
  const availableRegions = (allRegions ?? []).filter((r) => !takenRegionIds.has(r.id));

  return (
    <AppShell profile={profile}>
      <div className="max-w-3xl mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Struktur Organisasi</p>
        <h1 className="font-display text-2xl font-bold mb-1">Kelola RMDM</h1>
        <p className="text-ink-dim text-sm mb-6">
          Setiap RMDM memegang satu region. Buat region-nya dulu di halaman{" "}
          <a href="/admin/regions" className="text-signal-amber hover:underline">Region &amp; Wilayah</a>, baru buat akun RMDM di sini.
        </p>
        <RmdmManager rmdmList={rmdmList} territories={territories ?? []} availableRegions={availableRegions} />
      </div>
    </AppShell>
  );
}
