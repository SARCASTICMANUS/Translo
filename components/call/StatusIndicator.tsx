import { AudioLines, Languages, Mic, Volume2 } from "lucide-react";
import { getLanguage } from "@/lib/languages";
import { cn } from "@/lib/utils";

const STATES = {
  idle: { icon: Mic, label: "Waiting to hear speech…", tone: "text-faint" },
  listening: { icon: Mic, label: "Listening…", tone: "text-muted" },
  processing: { icon: AudioLines, label: "Processing…", tone: "text-muted" },
  translating: { icon: Languages, label: "Translating…", tone: "text-accent" },
  speaking: { icon: Volume2, label: "Speaking…", tone: "text-accent" },
} as const;

/**
 * Small status chip that names what the interpreter is doing right now.
 * This is the honest pacing cue — every pause on screen is labeled.
 */
export function StatusIndicator({
  state,
  targetLang,
}: {
  state: keyof typeof STATES;
  targetLang?: string;
}) {
  const current = STATES[state];
  const Icon = current.icon;
  const label =
    state === "translating" && targetLang
      ? `Translating to ${getLanguage(targetLang).label}…`
      : current.label;

  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        current.tone,
        state === "speaking" || state === "translating"
          ? "bg-accent-soft"
          : "bg-surface-raised",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}