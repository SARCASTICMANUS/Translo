"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock,
  FileText,
  Languages,
  PhoneOff,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TranscriptView } from "@/components/transcript/TranscriptView";
import { LanguageChip } from "@/components/ui/LanguageChip";
import { buildCallScript, callSummary, getOrder } from "@/lib/mock-data";
import { getLanguage } from "@/lib/languages";
import { usePreferences } from "@/lib/prefs";
import { formatCallDuration } from "@/lib/utils";

export function SummaryScreen({
  orderId,
  durationSeconds,
}: {
  orderId: string;
  durationSeconds: number;
}) {
  const router = useRouter();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [prefs] = usePreferences();

  const order = getOrder(orderId);

  if (!order) {
    return (
      <AppShell>
        <section className="px-5 pt-10 text-center">
          <p className="text-sm text-muted">Call data no longer available.</p>
          <Button className="mt-4" fullWidth onClick={() => router.push("/")}>
            Back to orders
          </Button>
        </section>
      </AppShell>
    );
  }

  const script = buildCallScript(order.customerLanguage);
  const myLang = getLanguage(prefs.myLanguage);

  return (
    <AppShell>
      <header className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <Logo />
        <span className="rounded-full bg-surface-raised px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted">
          Call ended
        </span>
      </header>

      <section className="flex flex-col items-center px-5 pt-6 pb-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-raised text-muted">
          <PhoneOff className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
          Call ended
        </h1>
        <p className="mt-1 text-sm text-muted">
          {order.customerName} · Order #{order.orderNumber}
        </p>
      </section>

      {/* Call facts */}
      <Card className="mx-4 flex items-center justify-around px-4 py-4">
        <Fact
          icon={<Clock className="h-4 w-4" />}
          label="Duration"
          value={formatCallDuration(durationSeconds)}
        />
        <div className="h-8 w-px bg-line" />
        <Fact
          icon={<Languages className="h-4 w-4" />}
          label="Languages"
          value={
            <span className="flex items-center gap-1.5">
              <LanguageChip code={prefs.myLanguage} />
              <span className="text-faint">→</span>
              <LanguageChip code={order.customerLanguage} />
            </span>
          }
        />
      </Card>

      {/* AI summary */}
      <Card className="mx-4 mt-3 p-5">
        <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Summary
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          {callSummary(order)}
        </p>
        <p className="mt-2 text-[11px] text-faint">
          {myLang.label} ↔ {getLanguage(order.customerLanguage).label} — both
          sides confirmed this on the call.
        </p>
      </Card>

      {/* Actions */}
      <div className="mx-4 mt-5 flex flex-col gap-2">
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => setTranscriptOpen((value) => !value)}
        >
          <FileText className="h-4 w-4" />
          {transcriptOpen ? "Hide transcript" : "View transcript"}
        </Button>
        <Button size="lg" fullWidth onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" />
          Back to orders
        </Button>
      </div>

      {transcriptOpen && (
        <div className="px-4 pt-4 pb-8 animate-fade-in">
          <div className="mb-2 flex items-center gap-2">
            <Check className="h-4 w-4 text-accent" />
            <p className="text-xs text-muted">
              Full call transcript — {script.length} exchanges
            </p>
          </div>
          <TranscriptView
            turns={script}
            customerName={order.customerName}
            workerLang={prefs.myLanguage}
          />
        </div>
      )}
      <div className="pb-8" />
    </AppShell>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="flex items-center gap-1.5 text-faint">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-faint">
        {label}
      </span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}