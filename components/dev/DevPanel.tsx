"use client";

import { useEffect, useState } from "react";
import { Bug, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DevPanelData {
  connectionState: string;
  agentPresent: boolean;
  agentState: string;
  channel: string;
  myUid: string;
  myRole: string;
  sessionId: string;
  agentId: string;
  vendors: string;
  lastEvent: string;
  turns: number;
}

/**
 * Demo-mode developer panel (req #18). Hidden by default; toggled with the
 * bug button or the `D` key. Shows live technical diagnostics.
 */
export function DevPanel({ data }: { data: DevPanelData }) {
  const [enabled, setEnabled] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("translo_dev") === "1",
  );
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key.toLowerCase() === "d" && !e.metaKey && !e.ctrlKey) {
        setEnabled((v) => {
          try {
            localStorage.setItem("translo_dev", v ? "0" : "1");
          } catch {}
          return !v;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!enabled) return null;

  const rows: [string, React.ReactNode][] = [
    ["Connection", data.connectionState],
    [
      "Agent present",
      <span
        key="ap"
        className={data.agentPresent ? "text-brand-strong" : "text-danger"}
      >
        {String(data.agentPresent)}
      </span>,
    ],
    ["Agent state", data.agentState],
    ["Channel", <code key="ch">{data.channel}</code>],
    [`My UID (${data.myRole})`, <code key="uid">{data.myUid}</code>],
    ["Session ID", <code key="sid">{data.sessionId.slice(0, 8)}…</code>],
    ["Agent ID", <code key="aid">{data.agentId}</code>],
    ["Vendors", <span key="v" className="text-[11px]">{data.vendors}</span>],
    ["Last event", data.lastEvent],
    ["Transcript items", String(data.turns)],
  ];

  return (
    <div className="fixed bottom-24 left-4 z-40 w-72 overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-900/95 text-neutral-200 shadow-xl backdrop-blur">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-400 hover:text-neutral-200"
      >
        <span className="flex items-center gap-2">
          <Bug className="h-3.5 w-3.5" /> Translo dev panel
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <dl className="space-y-1.5 px-4 pb-4 pt-1 font-mono text-[11px] leading-relaxed">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-neutral-500">{k}</dt>
              <dd className="text-right break-all">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
