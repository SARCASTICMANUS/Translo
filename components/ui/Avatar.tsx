import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  emerald: "bg-accent-soft text-accent",
  slate: "bg-surface-raised text-muted",
};

export function Avatar({
  initials,
  className,
  tone = "slate",
}: {
  initials: string;
  className?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold tracking-wide",
        TONES[tone],
        className,
      )}
    >
      {initials}
    </span>
  );
}