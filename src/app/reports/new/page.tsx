import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ReportForm from "@/components/ReportForm";

export default async function NewReportPage() {
  const profile = await requireRole(["mdm", "rmdm", "mds"]);
  const supabase = createClient();

  let options: { id: string; label: string }[] = [];

  if (profile.role === "mdm") {
    const { data } = await supabase
      .from("profiles")
      .select("region_id, regions(name)")
      .eq("role", "rmdm");
    options = (data ?? [])
      .filter((p: any) => p.region_id)
      .map((p: any) => ({ id: p.region_id, label: p.regions?.name ?? p.region_id }));
  } else if (profile.role === "rmdm") {
    const { data } = await supabase
      .from("profiles")
      .select("territory_id, territories(name)")
      .eq("role", "mds")
      .eq("region_id", profile.region_id);
    options = (data ?? [])
      .filter((p: any) => p.territory_id)
      .map((p: any) => ({ id: p.territory_id, label: p.territories?.name ?? p.territory_id }));
  } else if (profile.role === "mds") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("supervisor_id", profile.id);
    options = (data ?? []).map((p: any) => ({ id: p.id, label: p.full_name }));
  }

  return (
    <AppShell profile={profile}>
      <div className="max-w-xl mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Laporan Bulanan</p>
        <h1 className="font-display text-2xl font-bold mb-6">Buat Laporan Baru</h1>
        <ReportForm role={profile.role as any} options={options} />
      </div>
    </AppShell>
  );
}
