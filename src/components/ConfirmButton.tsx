"use client";

import { useState } from "react";
import Spinner from "./Spinner";

interface ConfirmButtonProps {
  onConfirm: () => void | Promise<void>;
  children: React.ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  className?: string;
  variant?: "primary" | "danger" | "secondary";
  disabled?: boolean;
}

const VARIANT_CLASS: Record<string, string> = {
  primary: "btn-primary",
  danger: "bg-signal-red text-white font-semibold px-4 py-2 rounded hover:brightness-110 transition disabled:opacity-40",
  secondary: "btn-secondary",
};

export default function ConfirmButton({
  onConfirm,
  children,
  title,
  description,
  confirmLabel = "Ya, lanjutkan",
  cancelLabel = "Batal",
  className,
  variant = "primary",
  disabled,
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
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
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="btn-secondary"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className={VARIANT_CLASS[variant] + " flex items-center gap-2"}
              >
                {loading && <Spinner size={14} />}
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
