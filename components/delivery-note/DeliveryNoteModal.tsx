"use client";

import { useState } from "react";
import { ClipboardList, Loader2, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getLanguage } from "@/lib/languages";
import type { DeliveryNote } from "@/types";
import type { DetectedInstruction } from "@/lib/translation/instruction-detect";

/**
 * Confirmation gate for the external action (req #14): a delivery note is
 * only created after explicit user confirmation.
 */
export function DeliveryNoteModal({
  instruction,
  sessionId,
  channel,
  onClose,
  onConfirm,
}: {
  instruction: DetectedInstruction | null;
  sessionId?: string;
  channel: string;
  onClose: () => void;
  onConfirm: (note: DeliveryNote) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!instruction) return null;

  const sourceMeta = getLanguage(instruction.sourceLang || "en");

  const createNote = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/delivery-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId ?? "unknown-session",
          channel,
          instruction: instruction.original,
          translatedInstruction: instruction.translated,
          sourceSpeaker: instruction.speaker,
          sourceLang: sourceMeta.label,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = (await res.json()) as { note: DeliveryNote };
      onConfirm(data.note);
    } catch {
      setError("Could not save the note. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm delivery note"
    >
      <div className="w-full max-w-md animate-fade-up rounded-3xl border border-line bg-card p-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
            <ClipboardList className="h-4.5 w-4.5" />
          </span>
          <h2 className="text-base font-semibold">
            Create this delivery note?
          </h2>
        </div>

        <blockquote className="mt-4 rounded-2xl bg-black/[0.03] px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-ink-muted">
            {instruction.speaker} · {sourceMeta.label}
          </p>
          <p className="mt-1 text-sm font-medium leading-relaxed">
            “{instruction.original}”
          </p>
          {instruction.translated &&
            instruction.translated !== instruction.original && (
              <p className="mt-2 border-t border-dashed border-line pt-2 text-sm text-ink-muted">
                {instruction.translated}
              </p>
            )}
        </blockquote>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={createNote} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PackageCheck className="h-4 w-4" />
            )}
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
