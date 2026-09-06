import type { TranscriptMessage } from "@/web-client/src/index";
import { getLanguage } from "@/lib/languages";
import { Waveform } from "@/components/call/Waveform";
import { StatusIndicator } from "@/components/call/StatusIndicator";
import { cn } from "@/lib/utils";

function PhasePlaceholder({ phase, targetLang }: { phase: "processing" | "translating"; targetLang: string }) {
  const text =
    phase === "processing"
      ? "Cleaning up the audio…"
      : `Translating to ${getLanguage(targetLang).label}…`;
  return (
    <p className="text-xs text-faint animate-fade-in">{text}</p>
  );
}

export function ConversationTurn({
  turn,
  customerName,
  live,
  muted,
  captions,
  className,
}: {
  turn: TranscriptMessage;
  customerName: string;
  live: boolean;
  muted: boolean;
  captions: boolean;
  className?: string;
}) {
  const isWorker = turn.sender === "agent";
  const speakerName = isWorker ? "You" : customerName;

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 transition-colors duration-300",
        live ? "border-accent/25 bg-surface-raised" : "border-line bg-surface",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn("h-2 w-2 rounded-full", isWorker ? "bg-accent" : "bg-muted")}
          />
          <span className="text-xs font-semibold text-foreground">
            {speakerName}
          </span>
          <span className="text-xs text-faint">
            · {isWorker ? "Delivery Partner" : "Customer"}
          </span>
        </div>
        {live && (
          <StatusIndicator state="processing" targetLang="en" />
        )}
      </div>

      {captions && (
        <p className="mt-2 text-[11px] uppercase tracking-widest text-faint">
          {isWorker ? "You said" : `${customerName} said`}
        </p>
      )}

      {captions && (
        <p
          className={cn(
            "mt-1 text-sm leading-relaxed text-foreground/90",
            "animate-fade-in",
          )}
        >
          {turn.final || turn.partial}
        </p>
      )}

      <div
        className={cn(
          "mt-2 flex items-center justify-between gap-3 rounded-xl px-1",
          !live && "mt-3",
        )}
      >
        {live ? (
          <Waveform mode="listening" muted={muted} />
        ) : captions ? (
          <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-faint">
            Resolved
          </span>
        ) : null}
      </div>

      {captions && (
        <div className="mt-1 border-l-2 border-accent pl-3 animate-fade-in">
          <p className="text-sm font-medium leading-relaxed text-accent">
            {turn.final || turn.partial}
          </p>
          <p className="mt-0.5 text-[11px] text-faint">
            Heard in English
          </p>
        </div>
      )}

      {captions &&
        live &&
        turn.partial !== "" && !turn.final && (
          <div className="mt-2 border-l-2 border-line-strong pl-3">
            <PhasePlaceholder phase="translating" targetLang={turn.partial} />
          </div>
        )}
    </div>
  );
}