"use client";

import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { LanguageChip } from "@/components/ui/LanguageChip";
import { CALL_HISTORY } from "@/lib/mock-data";
import { formatCallDuration } from "@/lib/utils";

export function HistoryScreen() {
  const router = useRouter();

  return (
    <AppShell withNav>
      <header className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)] pb-1">
        <Logo />
      </header>

      <section className="px-5 pt-4 pb-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          History
        </h1>
        <p className="mt-1 text-sm text-muted">
          Calls you&apos;ve translated with Translo.
        </p>
      </section>

      <section className="flex flex-col gap-3 px-5 pt-3 pb-6">
        {CALL_HISTORY.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => router.push(`/history/${entry.id}`)}
            className="w-full text-left transition-transform active:scale-[0.99]"
          >
            <Card className="p-4 hover:border-line-strong">
              <div className="flex items-start gap-3">
                <Avatar initials={entry.customerInitials} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {entry.customerName}
                    </p>
                    <span className="shrink-0 text-xs tabular-nums text-faint">
                      {formatCallDuration(entry.durationSeconds)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    Order #{entry.orderNumber} · {entry.dateLabel},{" "}
                    {entry.timeLabel}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2.5">
                    <LanguageChip code={entry.languageFrom} />
                    <span className="text-faint">→</span>
                    <LanguageChip code={entry.languageTo} />
                  </div>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-faint" />
              </div>
            </Card>
          </button>
        ))}
      </section>
    </AppShell>
  );
}