"use client";

import { Sparkles, X } from "lucide-react";

/**
 * One-line coaching tip shown on the first visit to an active call. Dismiss
 * on tap; never shows again after dismissal (session-scoped mock, matching
 * the Settings → "Translation tip reminders" control).
 */
export function CoachingTip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="pointer-events-auto mx-4 flex items-center gap-2.5 rounded-2xl border border-accent/25 bg-surface-raised px-3.5 py-2.5 animate-fade-up">
      <Sparkles className="h-4 w-4 shrink-0 text-accent" />
      <p className="flex-1 text-xs leading-snug text-foreground/90">
        Speak, then pause — Translo needs a moment to translate.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss tip"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-faint hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}