"use client";

import { cn } from "@/lib/utils";

export type AgentChipState =
  | "joining"
  | "listening"
  | "thinking"
  | "speaking"
  | "idle"
  | "offline";

const LABELS: Record<AgentChipState, string> = {
  joining: "Translo is joining…",
  listening: "Translo is listening",
  thinking: "Translo is thinking…",
  speaking: "Translo is speaking — you can interrupt anytime",
  idle: "Translo is ready",
  offline: "Interpreter unavailable",
};

export function AgentStateChip({ state }: { state: AgentChipState }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-xs font-medium transition-colors duration-200",
        state === "speaking" && "bg-brand text-white",
        state === "listening" && "bg-brand-soft text-brand-strong",
        state === "thinking" && "bg-amber-50 text-amber-700",
        (state === "idle" || state === "joining") &&
          "bg-black/[0.04] text-ink-muted",
        state === "offline" && "bg-red-50 text-danger",
      )}
      role="status"
    >
      {(state === "listening" ||
        state === "thinking" ||
        state === "speaking") && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
      )}
      {LABELS[state]}
    </div>
  );
}
