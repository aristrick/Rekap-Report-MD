<<<<<<< HEAD
import { createServerClient } from "@supabase/ssr";
=======
import { createServerClient, type CookieOptions } from "@supabase/ssr";
>>>>>>> 9f0adc2a4dfb8e07dab2a328508115e64cc8dd19
import { NextResponse, type NextRequest } from "next/server";

// Menjaga sesi login tetap fresh di setiap request (dipanggil dari middleware.ts)
export async function updateSession(request: NextRequest) {
<<<<<<< HEAD
  let supabaseResponse = NextResponse.next({ request });
=======
  let response = NextResponse.next({ request: { headers: request.headers } });
>>>>>>> 9f0adc2a4dfb8e07dab2a328508115e64cc8dd19

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
<<<<<<< HEAD
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
=======
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
>>>>>>> 9f0adc2a4dfb8e07dab2a328508115e64cc8dd19
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isPublicApi = request.nextUrl.pathname.startsWith("/api/telegram") ||
                       request.nextUrl.pathname.startsWith("/api/cron");

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

<<<<<<< HEAD
  return supabaseResponse;
=======
  return response;
>>>>>>> 9f0adc2a4dfb8e07dab2a328508115e64cc8dd19
}
