"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Mic,
  MicOff,
  Package,
  User,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { LanguagePills } from "@/components/language-selector/LanguagePills";
import { generateRoomCode } from "@/lib/languages";
import { cn } from "@/lib/utils";
import type { SessionConfig } from "@/types";

type MicStatus = "checking" | "granted" | "denied";

export default function SetupScreen() {
  const router = useRouter();
  const [role, setRole] = useState<"worker" | "customer">("worker");
  const [workerLang, setWorkerLang] = useState("hi");
  const [customerLang, setCustomerLang] = useState("en");
  const [roomCode] = useState(generateRoomCode);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [micStatus, setMicStatus] = useState<MicStatus>("checking");
  const [pairLocked, setPairLocked] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  // Microphone preflight
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        stream.getTracks().forEach((t) => t.stop());
        if (!cancelled) setMicStatus("granted");
      } catch {
        if (!cancelled) setMicStatus("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveChannel = isJoining
    ? joinCode.trim().toUpperCase()
    : roomCode;

  const lookupActiveSession = useCallback(async (code: string) => {
    setLookupError(null);
    setPairLocked(false);
    try {
      const res = await fetch(
        `/api/agent/session?channel=translo-${encodeURIComponent(code)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.active) {
        setWorkerLang(data.workerLang);
        setCustomerLang(data.customerLang);
        setPairLocked(true);
      }
    } catch {
      // offline lookup failure is non-fatal
    }
  }, []);

  const handleJoinCodeChange = (value: string) => {
    setJoinCode(value.toUpperCase());
    if (value.trim().length >= 6) void lookupActiveSession(value.trim());
    else setPairLocked(false);
  };

  const start = () => {
    if (!effectiveChannel || effectiveChannel.length < 4) return;
    setStarting(true);
    const config: SessionConfig = {
      channel: `translo-${effectiveChannel}`,
      role,
      workerLang,
      customerLang,
    };
    sessionStorage.setItem("translo_session", JSON.stringify(config));
    router.push("/conversation");
  };

  const copyInvite = async () => {
    const url = `${window.location.origin}/?room=${roomCode}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center px-6 pb-16">
      <header className="w-full max-w-2xl flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            aria-label="Back"
            className="h-9 w-9 rounded-full border border-line bg-white inline-flex items-center justify-center text-ink-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Logo />
        </div>
      </header>

      <section className="w-full max-w-2xl animate-fade-up">
        <h1 className="text-3xl font-semibold tracking-tight">
          Set up your conversation
        </h1>
        <p className="mt-2 text-ink-muted text-sm md:text-base">
          Choose who you are and which languages the two sides speak. Share the
          room code with the other participant.
        </p>

        {/* Role */}
        <Card title="You are joining as" icon={<User className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-3">
            <RoleOption
              selected={role === "worker"}
              onClick={() => setRole("worker")}
              icon={<Package className="h-5 w-5" />}
              label="Worker"
              hint="On the ground, at the location"
            />
            <RoleOption
              selected={role === "customer"}
              onClick={() => setRole("customer")}
              icon={<User className="h-5 w-5" />}
              label="Customer"
              hint="Requesting the service"
            />
          </div>
        </Card>

        {/* Languages */}
        <Card
          title="Languages"
          icon={<span className="text-sm">🌐</span>}
          subtitle={
            pairLocked
              ? "Locked to the live session's pair"
              : undefined
          }
        >
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-medium text-ink-muted">
                Worker speaks
              </p>
              <LanguagePills
                value={workerLang}
                onChange={setWorkerLang}
                disabledCodes={
                  pairLocked
                    ? ["hi", "en", "bn", "ta", "te", "mr"].filter(
                        (c) => c !== workerLang,
                      )
                    : []
                }
                ariaLabel="Worker language"
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink-muted">
                Customer speaks
              </p>
              <LanguagePills
                value={customerLang}
                onChange={setCustomerLang}
                disabledCodes={
                  pairLocked
                    ? ["hi", "en", "bn", "ta", "te", "mr"].filter(
                        (c) => c !== customerLang,
                      )
                    : []
                }
                ariaLabel="Customer language"
              />
            </div>
            <p className="text-xs text-ink-muted/80">
              Code-switching works — people can mix languages naturally and
              Translo keeps up.
            </p>
          </div>
        </Card>

        {/* Room */}
        <Card title="Conversation room" icon={<span className="text-sm">🔗</span>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-full bg-black/[0.04] p-1">
              <TabButton
                active={!isJoining}
                onClick={() => setIsJoining(false)}
              >
                Create room
              </TabButton>
              <TabButton active={isJoining} onClick={() => setIsJoining(true)}>
                Join a room
              </TabButton>
            </div>

            {!isJoining ? (
              <div className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-ink-muted">
                    Room code
                  </p>
                  <p className="font-mono text-xl font-semibold tracking-[0.25em]">
                    {roomCode}
                  </p>
                </div>
                <Button variant="secondary" size="md" onClick={copyInvite}>
                  <Copy className="h-4 w-4" />
                  Copy invite link
                </Button>
              </div>
            ) : (
              <input
                value={joinCode}
                onChange={(e) => handleJoinCodeChange(e.target.value)}
                placeholder="Enter 6-character room code"
                maxLength={6}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 font-mono text-lg tracking-[0.25em] uppercase outline-none focus:border-brand transition-colors"
              />
            )}
            {pairLocked && (
              <p className="text-xs font-medium text-brand-strong">
                ✓ Live session found — language pair synced from the host.
              </p>
            )}
          </div>
        </Card>

        {/* Microphone */}
        <Card title="Microphone" icon={<Mic className="h-4 w-4" />}>
          {micStatus === "checking" && (
            <Status
              tone="neutral"
              icon={<Loader2 className="h-4 w-4 animate-spin" />}
              text="Checking microphone access…"
            />
          )}
          {micStatus === "granted" && (
            <Status
              tone="ok"
              icon={<Check className="h-4 w-4" />}
              text="Microphone ready."
            />
          )}
          {micStatus === "denied" && (
            <div className="space-y-3">
              <Status
                tone="error"
                icon={<MicOff className="h-4 w-4" />}
                text="Microphone blocked. Allow mic access in your browser settings, then retry."
              />
              <Button
                variant="secondary"
                size="md"
                onClick={() => window.location.reload()}
              >
                Retry permission
              </Button>
            </div>
          )}
        </Card>

        {lookupError && (
          <p className="mt-4 text-sm text-danger">{lookupError}</p>
        )}

        <div className="mt-8 flex justify-end">
          <Button
            size="lg"
            onClick={start}
            disabled={
              starting ||
              micStatus !== "granted" ||
              effectiveChannel.length < 4 ||
              (isJoining && joinCode.trim().length < 6)
            }
          >
            {starting && <Loader2 className="h-4 w-4 animate-spin" />}
            Start Live Conversation
          </Button>
        </div>
      </section>
    </main>
  );
}

function Card({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-line bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        {icon}
        <h2>{title}</h2>
      </div>
      {subtitle && (
        <p className="-mt-3 mb-4 text-xs text-ink-muted">{subtitle}</p>
      )}
      {children}
    </section>
  );
}

function RoleOption({
  selected,
  onClick,
  icon,
  label,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 text-left transition-all duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        selected
          ? "border-brand bg-brand-soft"
          : "border-line bg-white hover:border-brand/50",
      )}
    >
      <div
        className={cn(
          "mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full",
          selected ? "bg-brand text-white" : "bg-black/[0.05] text-ink-muted",
        )}
      >
        {icon}
      </div>
      <p className="font-medium">{label}</p>
      <p className="text-xs text-ink-muted mt-0.5">{hint}</p>
    </button>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full py-2 text-sm font-medium transition-all",
        active ? "bg-white shadow-sm" : "text-ink-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Status({
  tone,
  icon,
  text,
}: {
  tone: "neutral" | "ok" | "error";
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm",
        tone === "ok" && "bg-brand-soft text-brand-strong",
        tone === "error" && "bg-red-50 text-danger",
        tone === "neutral" && "bg-black/[0.04] text-ink-muted",
      )}
    >
      {icon}
      {text}
    </div>
  );
}
