"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Bottom sheet used by the language picker and expandable call content.
 * Mounted conditionally by callers; renders a backdrop + sliding panel.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
      />
      <div className="relative w-full max-w-md animate-sheet-up rounded-t-3xl border-t border-line bg-surface p-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-strong" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sheet"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}