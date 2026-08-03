import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import { NAMA_BULAN } from "@/lib/telegram";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ProgramDetailPage({ params }: { params: { id: string } }) {
  const profile = await requireProfile();
  const supabase = createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("id, name, description, period_month, period_year, letter_file_url, regions(name)")
    .eq("id", params.id)
    .single();

  if (!program) notFound();

  const { data: realizations } = await supabase
    .from("program_realizations")
    .select("id, status, submitted_at, excel_file_url, receipt_pdf_url, activity_photo_urls, territories(id, name)")
    .eq("program_id", params.id)
    .order("territories(name)", { ascending: true });

  const isMyTerritory = (territoryId: string) =>
    (profile.role === "mds" || profile.role === "admin" || profile.role === "tl") &&
    profile.territory_id === territoryId;

  return (
    <div>
      <Navbar profile={profile} />
      <main className="max-w-4xl mx-auto px-5 py-8">
        <Link href="/programs" className="text-sm text-ink-dim hover:text-ink">← Kembali ke daftar program</Link>

        <div className="mt-4 mb-6">
          <p className="label-eyebrow mb-1">
            {NAMA_BULAN[program.period_month - 1]} {program.period_year} · {(program as any).regions?.name}
          </p>
          <h1 className="font-display text-2xl font-bold">{program.name}</h1>
          {program.description && <p className="text-ink-dim text-sm mt-1">{program.description}</p>}
          {program.letter_file_url && (
            <a href={program.letter_file_url} target="_blank" className="text-signal-amber text-sm hover:underline mt-2 inline-block">
              📄 Lihat Surat Program
            </a>
          )}
        </div>

        <div className="grid gap-3">
          {(realizations ?? []).map((r: any) => (
            <div key={r.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{r.territories?.name}</p>
                  <p className="text-xs text-ink-dim font-mono">
                    {r.submitted_at ? `Dikirim ${new Date(r.submitted_at).toLocaleString("id-ID")}` : "Belum dikirim"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`status-pill status-${r.status}`}>{r.status}</span>
                  {isMyTerritory(r.territories.id) && r.status === "pending" && (
                    <Link href={`/programs/${program.id}/realization`} className="btn-primary text-sm !py-1.5">
                      Upload Bukti
                    </Link>
                  )}
                </div>
              </div>
              {(r.excel_file_url || r.receipt_pdf_url || (r.activity_photo_urls?.length ?? 0) > 0) && (
                <div className="flex gap-3 mt-3 pt-3 border-t border-base-line text-xs">
                  {r.excel_file_url && <a href={r.excel_file_url} target="_blank" className="text-signal-amber hover:underline">Excel</a>}
                  {r.receipt_pdf_url && <a href={r.receipt_pdf_url} target="_blank" className="text-signal-amber hover:underline">Tanda Terima</a>}
                  {(r.activity_photo_urls ?? []).map((url: string, i: number) => (
                    <a key={i} href={url} target="_blank" className="text-signal-amber hover:underline">Foto {i + 1}</a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
