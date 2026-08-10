import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Menjaga sesi login tetap fresh di setiap request (dipanggil dari middleware.ts)
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isPublicApi = request.nextUrl.pathname.startsWith("/api/telegram") ||
                       request.nextUrl.pathname.startsWith("/api/cron");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Kalau env variable belum kebaca (misalnya salah setting di Vercel), jangan
  // sampai seluruh web down dengan 500 — anggap saja belum login.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[middleware] NEXT_PUBLIC_SUPABASE_URL / ANON_KEY tidak ditemukan di environment variables");
    if (!isAuthRoute && !isPublicApi) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (!user && !isAuthRoute && !isPublicApi) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (err) {
    // Kalau Supabase gagal dihubungi (URL/key salah, project di-pause, dll),
    // jangan crash — arahkan ke login supaya web tetap bisa dibuka.
    console.error("[middleware] Gagal menghubungi Supabase:", err);
    if (!isAuthRoute && !isPublicApi) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }
}
