"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200",
        checked
          ? "border-accent bg-accent-strong"
          : "border-line-strong bg-surface-raised",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-200",
          checked ? "left-[calc(100%-24px)]" : "left-1",
        )}
      />
    </button>
  );
}