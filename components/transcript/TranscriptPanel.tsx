"use client";

import { useEffect, useRef } from "react";
import { ArrowDown, Bot } from "lucide-react";
import { getLanguage } from "@/lib/languages";
import { cn, formatTime } from "@/lib/utils";
import type { TranscriptGroup, TranscriptTurn } from "@/types";

export function TranscriptPanel({
  groups,
  workerLang,
  customerLang,
}: {
  groups: TranscriptGroup[];
  workerLang: string;
  customerLang: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-follow the newest content unless the user scrolled up to read.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTo({ top: el.scrollHeight });
  }, [groups]);

  return (
    <div className="flex h-full min-h-[220px] flex-col overflow-hidden rounded-3xl border border-line bg-card">
      <div className="border-b border-line px-5 py-3">
        <h2 className="text-sm font-semibold">Live transcript</h2>
        <p className="text-xs text-ink-muted">
          {getLanguage(workerLang).label} ↔ {getLanguage(customerLang).label} ·
          speech appears as it happens
        </p>
      </div>

      <div
        ref={scrollRef}
        className="thin-scroll flex-1 space-y-4 overflow-y-auto px-5 py-4"
      >
        {groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <Bot className="h-6 w-6 text-neutral-300" />
            <p className="text-sm text-ink-muted">
              Say something — the transcript will appear here.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <TranscriptItem key={group.id} group={group} />
          ))
        )}
      </div>
    </div>
  );
}

function TranscriptItem({ group }: { group: TranscriptGroup }) {
  const isAgentOnly = group.speaker === "translo";
  const sourceMeta = getLanguage(group.sourceLang || "en");
  const targetMeta = getLanguage(group.targetLang || "en");

  if (isAgentOnly) {
    return (
      <div className="rounded-2xl bg-brand-soft/60 px-4 py-3 animate-fade-up">
        <SpeakerRow
          name="Translo"
          lang={group.original.langCode}
          timestamp={group.original.timestampMs}
          tone="brand"
        />
        <p className="mt-1 text-sm leading-relaxed">{group.original.text}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up rounded-2xl border border-line px-4 py-3">
      <SpeakerRow
        name={group.speaker === "worker" ? "Worker" : "Customer"}
        lang={sourceMeta.code}
        nativeLabel={sourceMeta.label}
        timestamp={group.original.timestampMs}
        streaming={group.original.status === "in-progress"}
      />
      <p className="mt-1 text-sm leading-relaxed text-foreground">
        “{group.original.text}
        {group.original.status === "in-progress" && (
          <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-breathe bg-brand" />
        )}
        {group.original.text && "”"}
      </p>

      {group.translation !== null ? (
        <div className="mt-3 border-t border-dashed border-line pt-3">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
            <ArrowDown className="h-3 w-3" />
            Translo → {targetMeta.label}
          </div>
          <p
            className={cn(
              "text-sm leading-relaxed",
              group.translation.status === "in-progress" &&
                "text-ink-muted italic",
            )}
          >
            {group.translation.text}
            {group.translation.status === "in-progress" && (
              <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[3px] animate-breathe bg-brand" />
            )}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SpeakerRow({
  name,
  lang,
  nativeLabel,
  timestamp,
  streaming,
  tone = "plain",
}: {
  name: string;
  lang?: string;
  nativeLabel?: string;
  timestamp: number;
  streaming?: boolean;
  tone?: "plain" | "brand";
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "text-xs font-bold uppercase tracking-wide",
          tone === "brand" ? "text-brand-strong" : "text-foreground",
        )}
      >
        {name}
      </span>
      {nativeLabel && (
        <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-medium text-ink-muted">
          {nativeLabel}
        </span>
      )}
      {streaming && (
        <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-brand-strong">
          speaking…
        </span>
      )}
      <span className="ml-auto text-[10px] tabular-nums text-ink-muted">
        {timestamp > 0 ? formatTime(timestamp) : ""}
      </span>
      <span className="sr-only">{lang}</span>
    </div>
  );
}

export type { TranscriptTurn };
