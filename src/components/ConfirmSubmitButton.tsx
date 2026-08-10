"use client";

import { useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  className?: string;
  variant?: "primary" | "danger" | "secondary";
}

const VARIANT_CLASS: Record<string, string> = {
  primary: "btn-primary",
  danger: "bg-signal-red text-white font-semibold px-4 py-2 rounded hover:brightness-110 transition disabled:opacity-40",
  secondary: "btn-secondary",
};

// Sama seperti ConfirmButton, tapi untuk tombol di dalam <form action={serverAction}>.
// Klik pertama hanya membuka dialog konfirmasi (tidak submit form); baru saat dialog
// dikonfirmasi, form yang membungkusnya benar-benar di-submit (memicu Server Action).
export default function ConfirmSubmitButton({
  children,
  title,
  description,
  confirmLabel = "Ya, lanjutkan",
  cancelLabel = "Batal",
  className,
  variant = "primary",
}: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleConfirm() {
    btnRef.current?.closest("form")?.requestSubmit();
    setOpen(false);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? VARIANT_CLASS[variant]}
      >
        {children}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="card max-w-sm w-full">
            <p className="font-display font-semibold text-lg mb-2">{title}</p>
            {description && <p className="text-sm text-ink-dim mb-5">{description}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                {cancelLabel}
              </button>
              <button type="button" onClick={handleConfirm} className={VARIANT_CLASS[variant]}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
