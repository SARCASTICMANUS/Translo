"use client";

import { useEffect, useState } from "react";
import type { ScriptTurn, TurnPhase } from "@/types";

export interface LiveTurn extends ScriptTurn {
  phase: TurnPhase | "done";
}

/**
 * Drives the scripted conversation forward through the real latency shape
 * of translated speech: each turn is heard (listening), preprocessed,
 * translated, then spoken. The translated line is only ever surfaced at the
 * "speaking" step — never at the same instant as the raw line.
 */
export function useCallEngine(script: ScriptTurn[]) {
  const [turns, setTurns] = useState<LiveTurn[]>([]);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = window.setTimeout(resolve, ms);
        timers.push(t);
      });

    const PHASES: Array<{ phase: TurnPhase; ms: number }> = [
      { phase: "listening", ms: 1200 },
      { phase: "processing", ms: 520 },
      { phase: "translating", ms: 680 },
      { phase: "speaking", ms: 2600 },
    ];
    const EXCHANGE_PAUSE = 900;

    (async () => {
      for (let i = 0; i < script.length; i++) {
        setTurns((prev) => [
          ...prev,
          { ...script[i], phase: "listening" as const },
        ]);

        for (const step of PHASES) {
          await delay(step.ms);
          if (cancelled) return;
          setTurns((prev) =>
            prev.map((turn, index) =>
              index === i ? { ...turn, phase: step.phase } : turn,
            ),
          );
        }

        await delay(EXCHANGE_PAUSE);
        if (cancelled) return;
        setTurns((prev) =>
          prev.map((turn, index) =>
            index === i ? { ...turn, phase: "done" as const } : turn,
          ),
        );
      }
      if (cancelled) return;
      setIdle(true);
    })();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [script]);

  const liveIndex = turns.findIndex((turn) => turn.phase !== "done");
  return { turns, liveIndex, idle };
}