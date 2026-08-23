"use client";

import { useState } from "react";
import { Mic, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

function FlowStep({
  icon,
  label,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-2xl px-4 py-3 min-w-[104px]",
        accent
          ? "bg-brand-soft text-brand-strong"
          : "bg-white border border-line text-foreground",
      )}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function Arrow({ flip = false }: { flip?: boolean }) {
  return (
    <span
      className={cn(
        "text-line-strong text-xl text-neutral-300 select-none",
        flip && "rotate-180",
      )}
      aria-hidden
    >
      ↑
    </span>
  );
}

/**
 * Visual explanation of the bridge:
 *   Hindi mic → TRANSLO AI → English speaker (and the reverse below).
 */
export function FlowDiagram() {
  const [showReverse, setShowReverse] = useState(true);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Worker language → Translo → Customer language */}
      <div className="flex items-start justify-center gap-2">
        <div className="flex flex-col items-center gap-2">
          <FlowStep icon={<Mic className="h-4 w-4" />} label="Hindi 🎙️" />
          <Arrow />
        </div>

        <div className="mx-3 mt-[52px] flex flex-col items-center gap-2">
          <FlowStep
            icon={<span className="text-base">✦</span>}
            label="TRANSLO AI"
            accent
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <Arrow />
          <FlowStep
            icon={<Volume2 className="h-4 w-4" />}
            label="English 🔊"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowReverse((v) => !v)}
        className="text-xs font-medium text-ink-muted hover:text-foreground transition-colors"
      >
        {showReverse ? "Hide reverse direction" : "Show reverse direction"}
      </button>

      {showReverse && (
        <div className="animate-fade-up">
          <p className="mb-3 text-center text-xs uppercase tracking-widest text-ink-muted">
            And the reverse — live
          </p>
          <div className="flex items-start justify-center gap-2">
            <div className="flex flex-col items-center gap-2">
              <FlowStep icon={<Mic className="h-4 w-4" />} label="English 🎙️" />
              <Arrow />
            </div>
            <div className="mx-3 mt-[52px]">
              <FlowStep icon={<span className="text-base">✦</span>} label="TRANSLO AI" accent />
            </div>
            <div className="flex flex-col items-center gap-2">
              <Arrow />
              <FlowStep icon={<Volume2 className="h-4 w-4" />} label="Hindi 🔊" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
