import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import { redirect } from "next/navigation";

async function saveTelegramId(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const telegram_user_id = formData.get("telegram_user_id") as string;
  await supabase.from("profiles").update({ telegram_user_id }).eq("id", user.id);
  redirect("/profile?saved=1");
}

export default async function ProfilePage() {
  const profile: any = await requireProfile();

  return (
    <AppShell profile={profile}>
      <div className="max-w-md mx-auto px-5 py-8">
        <p className="label-eyebrow mb-1">Akun</p>
        <h1 className="font-display text-2xl font-bold mb-6">Profil Saya</h1>

        <div className="card mb-4">
          <p className="text-sm text-ink-dim mb-1">Nama</p>
          <p>{profile.full_name}</p>
        </div>

        <form action={saveTelegramId} className="card space-y-4">
          <div>
            <label className="text-sm text-ink-dim block mb-1">Telegram User ID</label>
            <input name="telegram_user_id" defaultValue={profile.telegram_user_id ?? ""} className="input-field" placeholder="Contoh: 123456789" />
            <p className="text-xs text-ink-dim mt-2 leading-relaxed">
              Ini WAJIB diisi supaya bot bisa mengenali laporan yang kamu kirim di group Telegram.
              Cara mendapatkannya: chat bot <b>@userinfobot</b> di Telegram, ID kamu akan muncul di balasannya.
            </p>
          </div>
          <button type="submit" className="btn-primary w-full">Simpan</button>
        </form>
            </div>
    </AppShell>
  );
}
