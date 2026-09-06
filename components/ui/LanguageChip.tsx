import { getLanguage } from "@/lib/languages";
import { cn } from "@/lib/utils";

export function LanguageChip({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const lang = getLanguage(code);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-raised px-2.5 py-1 text-xs font-medium text-muted",
        className,
      )}
    >
      <span aria-hidden>{lang.flag}</span>
      {lang.label}
    </span>
  );
}