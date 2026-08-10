import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import MdsManager from "@/components/MdsManager";

export default async function AdminMdsPage() {
  const profile = await requireRole(["mdm", "rmdm"]);
  const supabase = createClient();

  const { data: regions } = await supabase.from("regions").select("id, code, name").order("name");
  const { data: territories } = await supabase
    .from("territories")
    .select("id, code, name, region_id")
    .order("name");

  let mdsQuery = supabase
    .from("profiles")
    .select("id, full_name, email, territory_id, territories(name), regions(name)")
    .eq("role", "mds")
    .order("full_name");

  if (profile.role === "rmdm" && profile.region_id) {
    mdsQuery = mdsQuery.eq("region_id", profile.region_id);
  }

  const { data: mdsProfiles } = await mdsQuery;

  const mdsList = (mdsProfiles ?? []).map((p: any) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email ?? "-",
    territory_id: p.territory_id,
    territory_name: p.territories?.name ?? "-",
    region_name: p.regions?.name ?? "-",
  }));

  const scopedTerritories =
    profile.role === "rmdm" && profile.region_id
      ? (territories ?? []).filter((t) => t.region_id === profile.region_id)
      : territories ?? [];

  const scopedRegions =
    profile.role === "rmdm" && profile.region_id
      ? (regions ?? []).filter((r) => r.id === profile.region_id)
      : regions ?? [];

  return (
    <AppShell profile={profile}>
      <div className="max-w-3xl mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Struktur Organisasi</p>
        <h1 className="font-display text-2xl font-bold mb-1">Kelola MDS</h1>
        <p className="text-ink-dim text-sm mb-6">
          Setiap MDS memegang satu wilayah. Wilayah harus sudah ada dulu (dibuat lewat halaman Kelola RMDM).
        </p>
        <MdsManager
          mdsList={mdsList}
          regions={scopedRegions}
          territories={scopedTerritories}
          fixedRegionId={profile.role === "rmdm" ? profile.region_id ?? undefined : undefined}
        />
      </div>
    </AppShell>
  );
}
