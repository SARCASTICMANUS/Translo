import { getLanguage } from "@/lib/languages";
import { cn } from "@/lib/utils";

/**
 * Signature element of the call: the two languages on either side of the
 * Translo bridge, joined by a slowly flowing connector that never stops
 * while the call is live — translation is in motion between the two.
 */
export function LanguageFlowIndicator({
  workerLang,
  customerLang,
  className,
}: {
  workerLang: string;
  customerLang: string;
  className?: string;
}) {
  const you = getLanguage(workerLang);
  const them = getLanguage(customerLang);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-4",
        className,
      )}
    >
      <LanguageNode flag={you.flag} label={you.label} sub="You" />

      <div className="flex flex-1 flex-col items-center gap-1.5 px-1">
        <div className="flex w-full items-center gap-2">
          <span className="flow-line animate-thermal-flow flex-1" />
          <span className="rounded-full border border-accent/40 bg-accent-soft px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-[0.18em] text-accent">
            Translo AI
          </span>
          <span className="flow-line animate-thermal-flow flex-1" />
        </div>
        <p className="text-[10px] uppercase tracking-widest text-faint">
          Live translation active
        </p>
      </div>

      <LanguageNode flag={them.flag} label={them.label} sub="Customer" />
    </div>
  );
}

function LanguageNode({
  flag,
  label,
  sub,
}: {
  flag: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface-raised text-lg">
        <span aria-hidden>{flag}</span>
      </span>
      <span className="max-w-16 truncate text-center text-xs font-medium text-foreground">
        {label}
      </span>
      <span className="text-[9px] uppercase tracking-widest text-faint">
        {sub}
      </span>
    </div>
  );
}