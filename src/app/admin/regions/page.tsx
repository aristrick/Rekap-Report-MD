import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import RegionManager from "@/components/RegionManager";

export default async function AdminRegionsPage() {
  const profile = await requireRole(["mdm"]);
  const supabase = createClient();

  const { data: regions } = await supabase.from("regions").select("id, code, name").order("name");
  const { data: territories } = await supabase.from("territories").select("id, code, name, region_id").order("name");

  return (
    <AppShell profile={profile}>
      <div className="max-w-3xl mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Struktur Organisasi</p>
        <h1 className="font-display text-2xl font-bold mb-1">Region &amp; Wilayah</h1>
        <p className="text-ink-dim text-sm mb-6">
          Kelola daftar region dan wilayah secara langsung. Untuk akun login RMDM/MDS, buka halaman Kelola RMDM / Kelola MDS.
        </p>
        <RegionManager regions={regions ?? []} territories={territories ?? []} />
      </div>
    </AppShell>
  );
}
