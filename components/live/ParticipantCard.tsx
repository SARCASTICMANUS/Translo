"use client";

import { useEffect, useRef } from "react";
import { Mic, MicOff, Package, User } from "lucide-react";
import { getAudioLevel } from "@/lib/agora/volume-store";
import { cn } from "@/lib/utils";

/**
 * Live audio-level meter. Reads the shared volume store inside a
 * requestAnimationFrame loop and updates the DOM directly — zero React
 * re-renders while audio activity fluctuates. Bars only move when real audio
 * activity exists (levels come from Agora's volume-indicator event).
 */
function SpeakingBars({ uid, active }: { uid: string | null; active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const bars = containerRef.current?.children;
    const tick = () => {
      if (!bars) return;
      const level = uid ? getAudioLevel(uid) : 0;
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i] as HTMLElement;
        // Staggered sensitivity so short utterances still show motion.
        const sensitivity = 1 + i * 0.55;
        const value = Math.max(0.12, Math.min(1, level * sensitivity));
        bar.style.transform = `scaleY(${active ? value : 0.12})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [uid, active]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-5 items-center gap-[3px]",
        !active && "opacity-60",
      )}
      aria-hidden
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "speaking-bar h-full w-[3px] rounded-full",
            active ? "bg-brand" : "bg-neutral-300",
          )}
          style={{ transform: "scaleY(0.12)" }}
        />
      ))}
    </div>
  );
}

export function ParticipantCard({
  role,
  isMe,
  langLabel,
  langNative,
  flag,
  muted,
  levelUid,
}: {
  role: "worker" | "customer";
  isMe: boolean;
  langLabel: string;
  langNative: string;
  flag: string;
  muted: boolean;
  /** RTC UID whose live volume drives this card's indicator. */
  levelUid: string | null;
}) {
  const Icon = role === "worker" ? Package : User;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-3xl border bg-card p-5 transition-shadow duration-200",
        isMe ? "border-brand/40 shadow-[0_0_0_3px_rgba(0,152,73,0.06)]" : "border-line",
      )}
    >
      <div className="relative shrink-0">
        <span
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold",
            isMe
              ? "bg-brand text-white animate-pulse-ring"
              : "bg-black/[0.05] text-foreground",
          )}
        >
          <Icon className="h-6 w-6" />
        </span>
        <span className="absolute -bottom-1 -right-1 text-base">{flag}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {role === "worker" ? "Worker" : "Customer"}
          {isMe && (
            <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-strong">
              You
            </span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-muted">
          {langLabel} · {langNative}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1">
        <SpeakingBars uid={levelUid} active={!muted} />
        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-ink-muted">
          {muted ? (
            <>
              <MicOff className="h-3 w-3" /> Muted
            </>
          ) : (
            <>
              <Mic className="h-3 w-3" /> Mic on
            </>
          )}
        </span>
      </div>
    </div>
  );
}
