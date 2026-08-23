"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import AgoraRTC, {
  useRTCClient,
  useJoin,
  useLocalMicrophoneTrack,
  usePublish,
  useRemoteUsers,
  useClientEvent,
  RemoteUser,
} from "agora-rtc-react";
import {
  AgoraVoiceAI,
  AgoraVoiceAIEvents,
  AgentState,
  TranscriptHelperMode,
  type TranscriptHelperItem,
  type UserTranscription,
  type AgentTranscription,
} from "agora-agent-client-toolkit";
import { Mic, MicOff, PhoneOff, WifiOff, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { ParticipantCard } from "./ParticipantCard";
import { AgentStateChip } from "./AgentStateChip";
import { TranscriptPanel } from "@/components/transcript/TranscriptPanel";
import { DevPanel } from "@/components/dev/DevPanel";
import { DeliveryNoteModal } from "@/components/delivery-note/DeliveryNoteModal";
import { detectDeliveryInstruction, type DetectedInstruction } from "@/lib/translation/instruction-detect";
import { AGENT_UID, buildTranscriptGroups } from "@/lib/agora/transcript";
import { setAudioLevel } from "@/lib/agora/volume-store";
import { getLanguage } from "@/lib/languages";
import { cn } from "@/lib/utils";
import type {
  DeliveryNote,
  TranscriptGroup,
} from "@/types";
import type { ConversationViewProps } from "./LiveConversation";

type AgoraRtcWithParameters = typeof AgoraRTC & {
  setParameter?: (key: string, value: unknown) => void;
};

export default function ConversationView({
  config,
  uid,
  token,
  agentId,
  sessionId,
  vendors,
  agentStartFailed,
  rtmClient,
  onLeaveCleanup,
}: ConversationViewProps & { appId: string }) {
  const router = useRouter();
  const client = useRTCClient();
  const remoteUsers = useRemoteUsers();

  const [micEnabled, setMicEnabled] = useState(true);
  const [connectionState, setConnectionState] =
    useState<string>("CONNECTING");
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [rawTranscript, setRawTranscript] = useState<
    TranscriptHelperItem<Partial<UserTranscription | AgentTranscription>>[]
  >([]);
  const [lastEvent, setLastEvent] = useState<{ name: string; at: number }>({
    name: "—",
    at: 0,
  });
  const [pendingInstruction, setPendingInstruction] =
    useState<DetectedInstruction | null>(null);
  const [createdNote, setCreatedNote] = useState<DeliveryNote | null>(null);
  const promptedTurns = useRef<Set<string>>(new Set());
  const endedRef = useRef(false);

  const myRole: Speaker_ = config.role;
  const otherRole: Speaker_ = config.role === "worker" ? "customer" : "worker";

  // StrictMode-safe ready gate (official quickstart pattern): only the real
  // mount's timer fires, so useJoin joins exactly once.
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      if (!cancelled) setIsReady(true);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(id);
      setIsReady(false);
    };
  }, []);

  const { isConnected: joined } = useJoin(
    {
      appid: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
      channel: config.channel,
      token,
      uid: parseInt(uid, 10),
    },
    isReady,
  );

  const { localMicrophoneTrack } = useLocalMicrophoneTrack(isReady);
  usePublish([localMicrophoneTrack]);

  // Accurate transcript timing + volume indicators.
  useEffect(() => {
    if (!client) return;
    try {
      (AgoraRTC as AgoraRtcWithParameters).setParameter?.(
        "ENABLE_AUDIO_PTS",
        true,
      );
    } catch {}
    try {
      client.enableAudioVolumeIndicator();
    } catch {}
    const onVolumes = (
      volumes: { uid: number | string; level: number }[],
    ) => {
      for (const v of volumes) {
        if (v.uid === undefined || v.uid === null) continue;
        setAudioLevel(String(v.uid), v.level ?? 0);
      }
    };
    client.on("volume-indicator", onVolumes);
    return () => {
      client.off("volume-indicator", onVolumes);
    };
  }, [client]);

  // The AI interpreter's presence — derived from the remote user list.
  const agentPresent = remoteUsers.some((u) => String(u.uid) === AGENT_UID);
  useClientEvent(client, "connection-state-change", (curState: string) => {
    setConnectionState(curState);
  });

  // ---- Delivery-instruction detection over finalized utterances ----
  const createdNoteRef = useRef(false);
  const runDeliveryDetection = useCallback(
    (
      items: TranscriptHelperItem<
        Partial<UserTranscription | AgentTranscription>
      >[],
    ) => {
      const nextGroups = buildTranscriptGroups(
        items.map((item) => ({
          uid: String(item.uid),
          turn_id: item.turn_id,
          _time: typeof item._time === "number" ? item._time : 0,
          text: typeof item.text === "string" ? item.text : "",
          status: Number(item.status),
        })),
        { myUid: uid, myRole, otherRole },
        config.workerLang,
        config.customerLang,
      );
      for (const group of nextGroups) {
        if (group.speaker === "translo") continue;
        const done =
          group.original.status === "end" ||
          group.original.status === "interrupted";
        if (!done || promptedTurns.current.has(group.id)) continue;
        const detected = detectDeliveryInstruction(
          group.original.text,
          group.translation?.text ?? null,
          group.sourceLang,
          group.speaker,
          group.id,
        );
        if (detected && !createdNoteRef.current) {
          promptedTurns.current.add(group.id);
          setPendingInstruction(detected);
          return;
        }
      }
    },
    [uid, myRole, otherRole, config.workerLang, config.customerLang],
  );

  // ---- Translo transcript engine (RTM events → normalized groups) ----
  useEffect(() => {
    if (!isReady || !joined) return;
    let cancelled = false;

    (async () => {
      try {
        const ai = await AgoraVoiceAI.init({
          rtcEngine: client,
          rtmEngine: rtmClient,
          renderMode: TranscriptHelperMode.TEXT,
          enableLog: false,
        });
        if (cancelled) {
          ai.unsubscribe();
          ai.destroy();
          return;
        }

        ai.on(AgoraVoiceAIEvents.TRANSCRIPT_UPDATED, (t) => {
          setRawTranscript([...t]);
          setLastEvent({ name: "transcript", at: Date.now() });
          runDeliveryDetection(t);
        });
        ai.on(AgoraVoiceAIEvents.AGENT_STATE_CHANGED, (_, event) => {
          setAgentState(event.state);
          setLastEvent({ name: `state:${event.state}`, at: Date.now() });
        });
        ai.on(AgoraVoiceAIEvents.AGENT_INTERRUPTED, () => {
          setLastEvent({ name: "barge-in", at: Date.now() });
        });

        ai.subscribeMessage(config.channel);
      } catch (error) {
        console.error("[translo] voice engine init failed:", error);
      }
    })();

    return () => {
      cancelled = true;
      try {
        const ai = AgoraVoiceAI.getInstance();
        if (ai) {
          ai.unsubscribe();
          ai.destroy();
        }
      } catch {}
    };
  }, [isReady, joined, client, rtmClient, config.channel, runDeliveryDetection]);

  // ---- Grouping (render-derived) + delivery-instruction detection ----
  //
  // Detection runs inside the TRANSCRIPT_UPDATED event callback below (an
  // external-system subscription), not in an effect, so React state updates
  // stay event-driven.
  const groups: TranscriptGroup[] = useMemo(
    () =>
      buildTranscriptGroups(
        rawTranscript.map((item) => ({
          uid: String(item.uid),
          turn_id: item.turn_id,
          _time: typeof item._time === "number" ? item._time : 0,
          text: typeof item.text === "string" ? item.text : "",
          status: Number(item.status),
        })),
        { myUid: uid, myRole, otherRole },
        config.workerLang,
        config.customerLang,
      ),
    [rawTranscript, uid, myRole, otherRole, config.workerLang, config.customerLang],
  );

  // ---- Controls ----
  const toggleMic = useCallback(async () => {
    const track = localMicrophoneTrack;
    const next = !micEnabled;
    if (track) {
      try {
        await track.setEnabled(next);
      } catch (error) {
        console.error("Failed to toggle mic:", error);
        return;
      }
    }
    setMicEnabled(next);
  }, [micEnabled, localMicrophoneTrack]);

  const endConversation = useCallback(async () => {
    if (endedRef.current) return;
    endedRef.current = true;
    onLeaveCleanup({ channel: config.channel, agentId });
    try {
      sessionStorage.removeItem("translo_session");
    } catch {}
    router.push("/");
  }, [config.channel, agentId, onLeaveCleanup, router]);

  // Best-effort cleanup when the tab closes mid-call.
  useEffect(() => {
    const handler = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      onLeaveCleanup({ channel: config.channel, agentId });
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [config.channel, agentId, onLeaveCleanup]);

  const workerLangMeta = getLanguage(config.workerLang);
  const customerLangMeta = getLanguage(config.customerLang);

  // Resolve which RTC UID drives each participant card's live level:
  // my own card uses my UID; the counterpart is any remote human.
  const counterpartUid = useMemo(
    () =>
      remoteUsers
        .map((u) => String(u.uid))
        .find((u) => u !== AGENT_UID && u !== uid) ?? null,
    [remoteUsers, uid],
  );

  const connectionBanner = useMemo(() => {
    if (agentStartFailed && connectionState === "CONNECTED") {
      return {
        tone: "warn" as const,
        text: "The AI interpreter could not be reached. Audio connects, but no translation yet. End and retry.",
      };
    }
    if (
      connectionState === "RECONNECTING" ||
      connectionState === "CONNECTING"
    ) {
      return {
        tone: "info" as const,
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
        text:
          connectionState === "RECONNECTING"
            ? "Connection lost — trying to reconnect…"
            : "Connecting…",
      };
    }
    if (connectionState === "DISCONNECTED") {
      return {
        tone: "error" as const,
        icon: <WifiOff className="h-3.5 w-3.5" />,
        text: "Disconnected. Check your network — ending will return you home.",
      };
    }
    if (joined && !agentPresent && connectionState === "CONNECTED") {
      return {
        tone: "info" as const,
        text: "Waiting for the AI interpreter to join…",
      };
    }
    return null;
  }, [connectionState, agentStartFailed, joined, agentPresent]);

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3">
          <Logo href={null} />
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ink-muted">
              {workerLangMeta.label} ↔ {customerLangMeta.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                joined
                  ? "bg-brand-soft text-brand-strong"
                  : "bg-black/[0.05] text-ink-muted",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  joined ? "live-dot bg-brand" : "bg-neutral-400",
                )}
              />
              LIVE
            </span>
          </div>
        </div>
        {connectionBanner && (
          <div
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium",
              connectionBanner.tone === "info" &&
                "bg-blue-50 text-blue-700",
              connectionBanner.tone === "warn" &&
                "bg-amber-50 text-amber-700",
              connectionBanner.tone === "error" && "bg-red-50 text-danger",
            )}
          >
            {"icon" in connectionBanner ? connectionBanner.icon : null}
            {connectionBanner.text}
          </div>
        )}
      </header>

      {/* Participants */}
      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-5 pt-6 sm:grid-cols-2">
        <ParticipantCard
          role="worker"
          isMe={myRole === "worker"}
          langLabel={workerLangMeta.label}
          langNative={workerLangMeta.nativeLabel}
          flag={workerLangMeta.flag}
          muted={!micEnabled}
          levelUid={myRole === "worker" ? uid : counterpartUid}
        />
        <ParticipantCard
          role="customer"
          isMe={myRole === "customer"}
          langLabel={customerLangMeta.label}
          langNative={customerLangMeta.nativeLabel}
          flag={customerLangMeta.flag}
          muted={!micEnabled}
          levelUid={myRole === "customer" ? uid : counterpartUid}
        />
      </section>

      {/* Interpreter state */}
      <section className="mx-auto mt-4 flex w-full max-w-5xl justify-center px-5">
        <AgentStateChip
          state={
            connectionState !== "CONNECTED"
              ? "offline"
              : !agentPresent
                ? "joining"
                : agentState === "speaking"
                  ? "speaking"
                  : agentState === "thinking"
                    ? "thinking"
                    : agentState === "listening"
                      ? "listening"
                      : "idle"
          }
        />
      </section>

      {/* Transcript */}
      <section className="mx-auto w-full max-w-5xl flex-1 px-5 pt-4 pb-40">
        <TranscriptPanel
          groups={groups}
          workerLang={config.workerLang}
          customerLang={config.customerLang}
        />
      </section>

      {/* Controls */}
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-center gap-3 py-4">
          <Button
            variant={micEnabled ? "secondary" : "danger"}
            size="icon"
            onClick={toggleMic}
            aria-label={micEnabled ? "Mute microphone" : "Unmute microphone"}
            className={cn(!micEnabled && "animate-none")}
          >
            {micEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>
          <Button variant="danger" size="lg" onClick={endConversation}>
            <PhoneOff className="h-4 w-4" />
            End conversation
          </Button>
        </div>
      </footer>

      {/* Hidden remote audio players */}
      <div className="hidden">
        {remoteUsers.map((user) => (
          <RemoteUser key={String(user.uid)} user={user} />
        ))}
      </div>

      {/* Delivery-note confirmation */}
      <DeliveryNoteModal
        instruction={pendingInstruction}
        onClose={() => setPendingInstruction(null)}
        onConfirm={(note) => {
          createdNoteRef.current = true;
          setCreatedNote(note);
          setPendingInstruction(null);
        }}
        sessionId={sessionId}
        channel={config.channel}
      />

      {/* Created-note toast */}
      {createdNote && (
        <div className="fixed right-5 top-20 z-30 animate-fade-up rounded-2xl border border-line bg-card p-4 shadow-lg max-w-xs">
          <p className="flex items-center gap-2 text-sm font-semibold text-brand-strong">
            Delivery Note Created ✓
          </p>
          <p className="mt-1 line-clamp-3 text-sm text-ink-muted">
            “{createdNote.instruction}”
          </p>
          <button
            onClick={() => setCreatedNote(null)}
            className="mt-2 text-xs text-ink-muted underline underline-offset-2 hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      <DevPanel
        data={{
          connectionState,
          agentPresent,
          agentState: agentState ?? "unknown",
          channel: config.channel,
          myUid: uid,
          myRole,
          sessionId: sessionId ?? "—",
          agentId: agentId ?? "—",
          vendors: vendors
            ? `${vendors.stt} · ${vendors.llm} · ${vendors.tts}`
            : "—",
          lastEvent: lastEvent.at
            ? `${lastEvent.name} @ ${Math.round(lastEvent.at / 1000)}`
            : lastEvent.name,
          turns: rawTranscript.length,
        }}
      />
    </main>
  );
}

type Speaker_ = "worker" | "customer";
