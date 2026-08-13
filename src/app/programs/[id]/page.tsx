import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import { NAMA_BULAN, STATUS_LABEL } from "@/lib/telegram";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

async function markStatus(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const realizationId = formData.get("realization_id") as string;
  const status = formData.get("status") as string;
  const programId = formData.get("program_id") as string;

  await supabase.from("program_realizations").update({ status }).eq("id", realizationId);
  redirect(`/programs/${programId}`);
}

export default async function ProgramDetailPage({ params }: { params: { id: string } }) {
  const profile = await requireProfile();
  const supabase = createClient();
  const canManage = profile.role === "mdm" || profile.role === "rmdm";

  const { data: program } = await supabase
    .from("programs")
    .select("id, program_number, name, description, period_month, period_year, end_month, end_year, letter_file_url, regions(name)")
    .eq("id", params.id)
    .single();

  if (!program) notFound();

  const periodLabel = (() => {
    const start = `${NAMA_BULAN[program.period_month - 1]} ${program.period_year}`;
    if (!program.end_month || !program.end_year) return start;
    if (program.end_month === program.period_month && program.end_year === program.period_year) return start;
    return `${start} — ${NAMA_BULAN[program.end_month - 1]} ${program.end_year}`;
  })();

  const { data: realizations } = await supabase
    .from("program_realizations")
    .select("id, status, submitted_at, excel_file_url, receipt_pdf_url, activity_photo_urls, territories(id, name)")
    .eq("program_id", params.id)
    .order("territories(name)", { ascending: true });

  const territoryIds = (realizations ?? []).map((r: any) => r.territories?.id).filter(Boolean);
  const { data: assignees } = territoryIds.length
    ? await supabase
        .from("profiles")
        .select("full_name, territory_id")
        .eq("role", "mds")
        .in("territory_id", territoryIds)
    : { data: [] as any[] };

  const assigneeByTerritory: Record<string, string> = {};
  (assignees ?? []).forEach((a: any) => { assigneeByTerritory[a.territory_id] = a.full_name; });

  const isMyTerritory = (territoryId: string) =>
    (profile.role === "mds" || profile.role === "admin" || profile.role === "tl") &&
    profile.territory_id === territoryId;

  return (
    <AppShell profile={profile}>
      <div className="max-w-5xl mx-auto px-5 py-8">
        <Link href="/programs" className="text-sm text-ink-dim hover:text-ink">← Kembali ke daftar program</Link>

        <div className="mt-4 mb-2 flex items-center gap-3">
          <span className="text-2xl">📁</span>
          <div>
            <p className="label-eyebrow mb-1">
              {periodLabel} · {(program as any).regions?.name ?? "Semua Region"}
            </p>
            {program.program_number && <p className="text-xs text-signal-amber font-mono mb-1">{program.program_number}</p>}
            <h1 className="font-display text-2xl font-bold">{program.name}</h1>
          </div>
        </div>
        {program.description && <p className="text-ink-dim text-sm mb-2">{program.description}</p>}
        {program.letter_file_url && (
          <a href={program.letter_file_url} target="_blank" className="text-signal-amber text-sm hover:underline mb-4 inline-block">
            📄 Lihat Surat Program
          </a>
        )}

        <div className="card overflow-x-auto !p-0 mt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-dim border-b border-base-line bg-base">
                <th className="px-4 py-3 font-normal">Wilayah</th>
                <th className="px-4 py-3 font-normal">Ditugaskan ke</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">File Penyelesaian</th>
                <th className="px-4 py-3 font-normal">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-line">
              {(realizations ?? []).map((r: any) => {
                const hasFiles = r.excel_file_url || r.receipt_pdf_url || (r.activity_photo_urls?.length ?? 0) > 0;
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{r.territories?.name}</td>
                    <td className="px-4 py-3 text-ink-dim">{assigneeByTerritory[r.territories?.id] ?? "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`status-pill status-${r.status}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {r.excel_file_url && <a href={r.excel_file_url} target="_blank" className="text-signal-amber hover:underline">Excel</a>}
                        {r.receipt_pdf_url && <a href={r.receipt_pdf_url} target="_blank" className="text-signal-amber hover:underline">Tanda Terima</a>}
                        {(r.activity_photo_urls ?? []).map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" className="text-signal-amber hover:underline">Foto {i + 1}</a>
                        ))}
                        {!hasFiles && isMyTerritory(r.territories.id) && r.status === "pending" && (
                          <Link href={`/programs/${program.id}/realization`} className="btn-primary text-xs !py-1 !px-2.5">
                            Upload Bukti
                          </Link>
                        )}
                        {!hasFiles && !isMyTerritory(r.territories.id) && <span className="text-ink-dim">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canManage && hasFiles && (
                        <div className="flex gap-3">
                          <form action={markStatus}>
                            <input type="hidden" name="realization_id" value={r.id} />
                            <input type="hidden" name="program_id" value={program.id} />
                            <input type="hidden" name="status" value="approved" />
                            <ConfirmSubmitButton title="Setujui realisasi ini?" className="text-signal-green text-xs hover:underline">
                              Setujui
                            </ConfirmSubmitButton>
                          </form>
                          <form action={markStatus}>
                            <input type="hidden" name="realization_id" value={r.id} />
                            <input type="hidden" name="program_id" value={program.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <ConfirmSubmitButton title="Tolak realisasi ini?" variant="danger" className="text-signal-red text-xs hover:underline">
                              Tolak
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
