"use client";

import { LANGUAGE_LIST } from "@/lib/languages";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";

/** Bottom-sheet language picker shared by Order Detail and Settings. */
export function LanguagePickerSheet({
  open,
  onClose,
  selected,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  selected: string;
  onSelect: (code: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Your language">
      <div className="flex max-h-[60dvh] flex-col gap-2 overflow-y-auto pr-1">
        {LANGUAGE_LIST.map((lang) => {
          const isSelected = lang.code === selected;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                onSelect(lang.code);
                onClose();
              }}
              className={cn(
                "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition-colors",
                isSelected
                  ? "border-accent/50 bg-accent-soft text-accent"
                  : "border-line bg-surface-raised text-foreground hover:border-line-strong",
              )}
            >
              <span>
                <span aria-hidden className="mr-2">
                  {lang.flag}
                </span>
                {lang.label}
                <span className="ml-2 text-xs text-muted">
                  {lang.nativeLabel}
                </span>
              </span>
              {isSelected && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[#06281b]">
                  <CheckIcon />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}