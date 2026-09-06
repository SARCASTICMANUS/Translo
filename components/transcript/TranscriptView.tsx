import type { ScriptTurn } from "@/types";
import { getLanguage } from "@/lib/languages";
import { cn } from "@/lib/utils";

/**
 * Read-only, full-length transcript of a finished call. Reused by the
 * post-call summary and the History detail view.
 */
export function TranscriptView({
  turns,
  customerName,
  workerLang = "hi",
  className,
}: {
  turns: ScriptTurn[];
  customerName: string;
  workerLang?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {turns.map((turn) => {
        const isWorker = turn.speaker === "worker";
        const heardIn = getLanguage(turn.targetLang).label;
        return (
          <div
            key={turn.id}
            className="rounded-2xl border border-line bg-surface p-4"
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className={cn(
                  "h-2 w-2 rounded-full",
                  isWorker ? "bg-accent" : "bg-muted",
                )}
              />
              <span className="text-xs font-semibold text-foreground">
                {isWorker ? "You" : customerName}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-faint">
                · {isWorker ? getLanguage(workerLang).label : getLanguage(turn.rawLang).label}
              </span>
            </div>

            <p className="mt-2 text-sm leading-relaxed text-muted">
              {turn.raw}
            </p>

            <div className="mt-2 border-l-2 border-accent pl-3">
              <p className="text-sm leading-relaxed text-foreground">
                {turn.translated}
              </p>
              <p className="mt-0.5 text-[11px] text-faint">
                Heard in {heardIn}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}