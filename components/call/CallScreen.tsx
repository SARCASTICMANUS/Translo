"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, PhoneOff, Volume2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { LanguageFlowIndicator } from "@/components/call/LanguageFlowIndicator";
import { ConversationTurn } from "@/components/call/ConversationTurn";
import { DeliveryContextCard } from "@/components/call/DeliveryContextCard";
import { CoachingTip } from "@/components/call/CoachingTip";
import { Waveform } from "@/components/call/Waveform";
import { StatusIndicator } from "@/components/call/StatusIndicator";
import { useTransloCall } from "@/web-client/src/useTransloCall";
import { buildCallScript, getOrder } from "@/lib/mock-data";
import { getLanguage } from "@/lib/languages";
import { usePreferences } from "@/lib/prefs";
import { cn, formatClock } from "@/lib/utils";

type Stage = "connecting" | "live" | "ending";

export function CallScreen({ orderId }: { orderId: string }) {
  const router = useRouter();
  const order = getOrder(orderId);
  const [prefs, updatePrefs] = usePreferences();

  const [stage, setStage] = useState<Stage>("connecting");
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [tipVisible, setTipVisible] = useState(
    () => prefs.tipReminders && !prefs.seenCoachingTip,
  );

  const script = useMemo(
    () => buildCallScript(order?.customerLanguage ?? "en"),
    [order?.customerLanguage],
  );

  const {
    start,
    end,
    toggleMute,
    transcript,
    connected,
    muted: clientMuted,
    attachAgentAudio,
  } = useTransloCall({});

  const scrollRef = useRef<HTMLDivElement>(null);

  const detected = useMemo(() => {
    for (const msg of transcript) {
      if (msg.final && msg.sender === "agent") {
        return null;
      }
    }
    return null;
  }, [transcript]);

  // Connecting → live
  useEffect(() => {
    const timer = window.setTimeout(() => setStage("live"), 1700);
    return () => window.clearTimeout(timer);
  }, []);

  // Call timer (real interval, counts up from connect)
  useEffect(() => {
    if (stage !== "live") return;
    const interval = window.setInterval(
      () => setElapsed((seconds) => seconds + 1),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [stage]);

  // Keep the newest turns in view
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [transcript.length]);

  if (!order) {
    return (
      <div className="app-stage">
        <div className="app-shell app-shell--full items-center justify-center px-8 text-center">
          <p className="text-sm text-muted">Order not found.</p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Back to orders
          </Button>
        </div>
      </div>
    );
  }

  const endCall = () => {
    setStage("ending");
    window.setTimeout(
      () =>
        router.replace(
          `/summary?order=${encodeURIComponent(order.id)}&duration=${elapsed}`,
        ),
      320,
    );
  };

  const dismissTip = () => {
    setTipVisible(false);
    updatePrefs({ seenCoachingTip: true });
  };

  if (stage === "connecting") {
    return <ConnectingState orderId={order.id} onCancel={() => router.back()} />;
  }

  // Start the Agora call when we enter live stage
  useEffect(() => {
    if (stage === "live") {
      start(order.id);
    }
    return () => {
      // no cleanup needed here; useTransloCall handles leave on unmount
    };
  }, [stage, start]);

  const visibleTurns = transcript.slice(-3);
  const showWaiting = !connected || transcript.length === 0;

  return (
    <div className="app-stage">
      <div className="app-shell app-shell--full">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 pt-[max(env(safe-area-inset-top),0.9rem)]">
          <Logo className="scale-90" />
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-breathe" />
              Live
            </span>
            <span className="font-display text-lg font-semibold tabular-nums text-foreground">
              {formatClock(elapsed)}
            </span>
          </div>
        </header>

        {/* Customer identity */}
        <div className="flex flex-col items-center pt-2 pb-3">
          <Avatar initials={order.customerInitials} tone="emerald" className="h-14 w-14 text-base" />
          <p className="mt-2 font-display text-xl font-semibold text-foreground">
            {order.customerName}
          </p>
          <p className="text-xs text-muted">
            Customer · Order #{order.orderNumber}
          </p>
        </div>

        {/* Language bridge */}
        <div className="px-4">
          <LanguageFlowIndicator
            workerLang={prefs.myLanguage}
            customerLang={order.customerLanguage}
          />
        </div>

        {/* First-use coaching tip */}
        {tipVisible && (
          <div className="mt-3">
            <CoachingTip onDismiss={dismissTip} />
          </div>
        )}

        {/* Conversation */}
        <div
          ref={scrollRef}
          className="app-scroll mx-4 mb-2 mt-3 flex flex-col gap-2 px-0.5"
        >
          {visibleTurns.map((msg, index) => (
            <ConversationTurn
              key={msg.id}
              turn={msg}
              customerName={order.customerName}
              live={connected}
              muted={muted && msg.sender === "user"}
              captions={prefs.liveCaptions}
              className={cn(
                index === 0 && visibleTurns.length === 3 && "opacity-70",
              )}
            />
          ))}

          {/* Waiting lane — interpreter listening between exchanges */}
          {showWaiting && (
            <div className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3">
              <Waveform mode="idle" muted={muted} />
              <div>
                <StatusIndicator state="idle" />
              </div>
            </div>
          )}
        </div>

        {/* Delivery context */}
        <div className="pb-2">
          <DeliveryContextCard order={order} detected={detected} live />
        </div>

        {/* Mute hint */}
        {muted && (
          <p className="mx-4 mb-1.5 text-center text-[11px] text-muted">
            You're muted — {order.customerName} can't hear you.
          </p>
        )}

        {/* Controls */}
        <CallControls
          muted={muted || clientMuted}
          onToggleMute={() => setMuted((value) => !value)}
          speakerOn={speakerOn}
          onToggleSpeaker={() => setSpeakerOn((value) => !value)}
          onEnd={endCall}
        />
      </div>
    </div>
  );
}

function ConnectingState({
  orderId,
  onCancel,
}: {
  orderId: string;
  onCancel: () => void;
}) {
  const order = getOrder(orderId);
  if (!order) return null;

  return (
    <div className="app-stage">
      <div className="app-shell app-shell--full items-center justify-center px-8 text-center">
        <div className="connecting-ring">
          <Avatar initials={order.customerInitials} tone="emerald" className="h-20 w-20 text-xl" />
        </div>
        <p className="mt-8 font-display text-xl font-semibold text-foreground">
          Calling {order.customerName}…
        </p>
        <p className="mt-1 text-sm text-muted">
          Their phone is ringing now · Order #{order.orderNumber}
        </p>
        <p className="mt-3 max-w-60 text-xs leading-relaxed text-faint">
          {getLanguage(order.customerLanguage).label} will be spoken by Translo
          when the call connects.
        </p>
        <Button variant="ghost" className="mt-10" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function CallControls({
  muted,
  onToggleMute,
  speakerOn,
  onToggleSpeaker,
  onEnd,
}: {
  muted: boolean;
  onToggleMute: () => void;
  speakerOn: boolean;
  onToggleSpeaker: () => void;
  onEnd: () => void;
}) {
  return (
    <div className="border-t border-line bg-[#0b1017]/90 px-5 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] backdrop-blur-md">
      <div className="mx-auto grid max-w-sm grid-cols-3 items-center">
        <ControlButton
          label={muted ? "Unmute" : "Mute"}
          active={muted}
          onClick={onToggleMute}
        >
          {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </ControlButton>

        <button
          type="button"
          onClick={onEnd}
          aria-label="End call"
          className="mx-auto flex h-16 w-16 items-center justify-center justify-self-rounded rounded-full bg-danger text-white shadow-lg transition-all duration-200 active:scale-95"
        >
          <PhoneOff className="h-6 w-6" />
        </button>

        <ControlButton
          label="Speaker"
          active={speakerOn}
          onClick={onToggleSpeaker}
        >
          <Volume2 className="h-6 w-6" />
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-200 active:scale-95",
          active
            ? "border-accent bg-accent-soft text-accent"
            : "border-line bg-surface-raised text-foreground hover:border-line-strong",
        )}
      >
        {children}
      </button>
      <span
        className={cn(
          "text-[11px]",
          active ? "text-accent" : "text-faint",
        )}
      >
        {label}
      </span>
    </div>
  );
}