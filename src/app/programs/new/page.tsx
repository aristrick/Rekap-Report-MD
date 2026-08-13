import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ProgramForm from "@/components/ProgramForm";

export default async function NewProgramPage() {
  const profile = await requireRole(["mdm", "rmdm"]);
  const supabase = createClient();
  const { data: regions } = await supabase.from("regions").select("id, name").order("name");

  return (
    <AppShell profile={profile}>
      <div className="max-w-xl mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Program</p>
        <h1 className="font-display text-2xl font-bold mb-6">Buat Program Baru</h1>
        <ProgramForm
          role={profile.role as any}
          regions={regions ?? []}
          fixedRegionId={profile.role === "rmdm" ? profile.region_id ?? undefined : undefined}
        />
      </div>
    </AppShell>
  );
}
