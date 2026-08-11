"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 menit
const SESSION_FLAG_KEY = "rekap_session_active";
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];

// Dipasang sekali di AppShell (jadi aktif di semua halaman setelah login).
// 1. Kalau sessionStorage flag tidak ada (browser/tab baru saja dibuka lagi
//    setelah sebelumnya ditutup total), paksa logout meskipun cookie sesi
//    Supabase masih valid -- supaya "tutup window = harus login lagi".
// 2. Kalau tidak ada aktivitas mouse/keyboard selama 30 menit, otomatis logout.
export default function SessionGuard() {
  const router = useRouter();
  const supabase = createClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const hasActiveFlag = sessionStorage.getItem(SESSION_FLAG_KEY);

    if (!hasActiveFlag) {
      // Tab/browser ini baru dibuka (bukan reload halaman biasa) -- anggap
      // sesi lama sudah "ditutup", paksa login ulang.
      supabase.auth.signOut().then(() => {
        router.replace("/login");
      });
      return;
    }

    function resetIdleTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await supabase.auth.signOut();
        sessionStorage.removeItem(SESSION_FLAG_KEY);
        router.replace("/login?timeout=1");
      }, IDLE_LIMIT_MS);
    }

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetIdleTimer));
    resetIdleTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return null;
}
