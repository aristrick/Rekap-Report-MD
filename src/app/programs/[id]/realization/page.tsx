import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import RealizationForm from "@/components/RealizationForm";
import { notFound, redirect } from "next/navigation";

export default async function RealizationUploadPage({ params }: { params: { id: string } }) {
  const profile = await requireRole(["mds", "admin", "tl"]);
  if (!profile.territory_id) redirect("/dashboard");

  const supabase = createClient();
  const { data: program } = await supabase.from("programs").select("id, name").eq("id", params.id).single();
  if (!program) notFound();

  return (
    <div>
      <Navbar profile={profile} />
      <main className="max-w-xl mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Realisasi Program</p>
        <h1 className="font-display text-2xl font-bold mb-6">{program.name}</h1>
        <RealizationForm programId={program.id} territoryId={profile.territory_id} />
      </main>
    </div>
  );
}
