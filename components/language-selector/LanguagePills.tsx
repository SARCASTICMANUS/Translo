"use client";

import { getLanguage, LANGUAGE_LIST } from "@/lib/languages";
import { cn } from "@/lib/utils";

export function LanguagePills({
  value,
  onChange,
  disabledCodes = [],
  ariaLabel,
}: {
  value: string;
  onChange: (code: string) => void;
  disabledCodes?: string[];
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2"
    >
      {LANGUAGE_LIST.map((lang) => {
        const selected = value === lang.code;
        const disabled = disabledCodes.includes(lang.code);
        return (
          <button
            key={lang.code}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(lang.code)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm transition-all duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              disabled && "opacity-40 cursor-not-allowed",
              selected
                ? "border-brand bg-brand text-white shadow-sm"
                : "border-line bg-white hover:border-brand/50 text-foreground",
            )}
          >
            {getLanguage(lang.code).label}
          </button>
        );
      })}
    </div>
  );
}
