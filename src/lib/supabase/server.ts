<<<<<<< HEAD
import { createServerClient } from "@supabase/ssr";
=======
import { createServerClient, type CookieOptions } from "@supabase/ssr";
>>>>>>> 9f0adc2a4dfb8e07dab2a328508115e64cc8dd19
import { cookies } from "next/headers";

// Dipakai di Server Component, Server Action, dan Route Handler
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
<<<<<<< HEAD
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
=======
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
>>>>>>> 9f0adc2a4dfb8e07dab2a328508115e64cc8dd19
          } catch {
            // Diabaikan: bisa terjadi saat dipanggil dari Server Component
            // yang tidak boleh menulis cookie (akan ditangani middleware).
          }
        },
<<<<<<< HEAD
=======
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // sama seperti di atas
          }
        },
>>>>>>> 9f0adc2a4dfb8e07dab2a328508115e64cc8dd19
      },
    }
  );
}

// Client dengan Service Role Key, HANYA untuk dipakai di route API server-side
// yang butuh bypass RLS (contoh: webhook Telegram yang tidak punya sesi user).
// JANGAN pernah import file ini di Client Component.
import { createClient as createRawClient } from "@supabase/supabase-js";

export function createServiceRoleClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
