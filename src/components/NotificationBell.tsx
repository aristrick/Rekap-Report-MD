"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: "revision" | "review";
  templateId: string;
  title: string;
  detail: string;
}

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.ok) setItems(json.items);
    } catch {
      // diabaikan, coba lagi di interval berikutnya
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // refresh tiap 1 menit
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-base-panel transition"
        aria-label="Notifikasi"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-dim">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {items.length > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-signal-red rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 card !p-0 z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-base-line">
            <p className="text-sm font-medium">Notifikasi</p>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-xs text-ink-dim text-center">Tidak ada notifikasi baru.</p>
          ) : (
            <div className="divide-y divide-base-line">
              {items.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={`/reports/${item.templateId}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 hover:bg-base transition"
                >
                  <p className="text-sm">{item.title}</p>
                  <p className={`text-xs mt-0.5 ${item.type === "revision" ? "text-signal-red" : "text-signal-amber"}`}>
                    {item.type === "revision" ? "⚠️ " : "🔔 "}{item.detail}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
