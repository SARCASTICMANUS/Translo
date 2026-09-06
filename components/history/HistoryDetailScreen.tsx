"use client";

import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LanguageChip } from "@/components/ui/LanguageChip";
import { TranscriptView } from "@/components/transcript/TranscriptView";
import { getHistoryEntry } from "@/lib/mock-data";
import { formatCallDuration } from "@/lib/utils";

export function HistoryDetailScreen({ entryId }: { entryId: string }) {
  const router = useRouter();
  const entry = getHistoryEntry(entryId);

  if (!entry) {
    return (
      <AppShell>
        <PageHeader onBack={() => router.push("/history")} />
        <section className="px-5 pt-6 text-center">
          <p className="text-sm text-muted">This call is no longer available.</p>
          <Button className="mt-4" fullWidth onClick={() => router.push("/history")}>
            Back to history
          </Button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader onBack={() => router.push("/history")} />

      <section className="px-5 pt-2 pb-4">
        <div className="flex items-center gap-3">
          <Avatar initials={entry.customerInitials} tone="emerald" className="h-12 w-12 text-sm" />
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">
              {entry.customerName}
            </h1>
            <p className="mt-0.5 text-xs text-muted">Order #{entry.orderNumber}</p>
          </div>
        </div>

        <Card className="mt-4 flex items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-xs text-muted">
            <CalendarClock className="h-4 w-4 text-faint" />
            {entry.dateLabel} · {entry.timeLabel}
          </span>
          <span className="text-xs tabular-nums text-faint">
            {formatCallDuration(entry.durationSeconds)}
          </span>
        </Card>

        <Card className="mt-3 flex items-center gap-2 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-faint">
            Languages
          </p>
          <div className="ml-auto flex items-center gap-2">
            <LanguageChip code={entry.languageFrom} />
            <span className="text-faint">→</span>
            <LanguageChip code={entry.languageTo} />
          </div>
        </Card>

        <h2 className="mt-6 mb-3 px-1 text-[10px] font-semibold uppercase tracking-widest text-faint">
          Transcript
        </h2>
        <TranscriptView
          turns={entry.transcript}
          customerName={entry.customerName}
          workerLang={entry.languageFrom}
        />
      </section>
    </AppShell>
  );
}