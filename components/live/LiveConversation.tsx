"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { RTMClient } from "agora-rtm";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type {
  AgentStartResponse,
  AgentStopRequest,
  SessionConfig,
  TokenResponse,
} from "@/types";

const AgoraProvider = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } = await import(
      "agora-rtc-react"
    );
    return {
      default: function AgoraProviders({
        children,
      }: {
        children: React.ReactNode;
      }) {
        const clientRef =
          useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null);
        if (!clientRef.current) {
          // useRef persists across StrictMode's simulated unmount/remount.
          clientRef.current = AgoraRTC.createClient({
            mode: "rtc",
            codec: "vp8",
          });
        }
        return (
          <AgoraRTCProvider client={clientRef.current}>
            {children}
          </AgoraRTCProvider>
        );
      },
    };
  },
  { ssr: false },
);

const ConversationView = dynamic(() => import("./ConversationView"), {
  ssr: false,
});

type Phase = "booting" | "live" | "error";

export interface ConversationViewProps {
  config: SessionConfig;
  appId: string;
  uid: string;
  token: string;
  agentId?: string;
  sessionId?: string;
  vendors?: AgentStartResponse["vendors"];
  agentStartFailed: boolean;
  rtmClient: RTMClient;
  /** Best-effort server cleanup; called once per channel on end/unload. */
  onLeaveCleanup: (req: AgentStopRequest) => void;
}

export default function LiveConversation() {
  const router = useRouter();
  // ssr:false wrapper guarantees sessionStorage exists at first render.
  const [config] = useState<SessionConfig | null>(() => {
    try {
      const raw = sessionStorage.getItem("translo_session");
      return raw ? (JSON.parse(raw) as SessionConfig) : null;
    } catch {
      return null;
    }
  });
  const [phase, setPhase] = useState<Phase>("booting");
  const [bootError, setBootError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [agentInfo, setAgentInfo] = useState<AgentStartResponse | null>(null);
  const [rtmClient, setRtmClient] = useState<RTMClient | null>(null);
  const startedRef = useRef(false);
  const rtmClientRef = useRef<RTMClient | null>(null);

  useEffect(() => {
    if (!config) router.replace("/setup");
  }, [config, router]);

  const boot = useCallback(async (cfg: SessionConfig) => {
    setBootError(null);
    try {
      // 1. RTC + RTM token
      const tokenRes = await fetch("/api/agora/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: cfg.channel }),
      });
      if (!tokenRes.ok) {
        const data = await tokenRes.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not reach the Translo service.");
      }
      const token = (await tokenRes.json()) as TokenResponse;

      // 2. Start the AI interpreter (idempotent server-side) and log into
      //    RTM in parallel. A failed agent start is non-fatal: the UI shows
      //    a recovery banner while audio still connects.
      let agent: AgentStartResponse | null = null;
      const startPromise = fetch("/api/agent/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: cfg.channel,
          workerLang: cfg.workerLang,
          customerLang: cfg.customerLang,
          startedBy: cfg.role,
        }),
      })
        .then(async (res) => {
          if (!res.ok) return null;
          return (await res.json()) as AgentStartResponse;
        })
        .catch(() => null);

      const rtmPromise = (async () => {
        const { default: AgoraRTM } = await import("agora-rtm");
        const rtm: RTMClient = new AgoraRTM.RTM(token.appId, token.uid);
        await rtm.login({ token: token.token });
        await rtm.subscribe(token.channel);
        return rtm;
      })();

      const [agentResult, rtm] = await Promise.all([startPromise, rtmPromise]);
      agent = agentResult;

      rtmClientRef.current = rtm;
      setAgentInfo(agent);
      setRtmClient(rtm);
      setTokenData(token);
      setPhase("live");
    } catch (error) {
      setBootError(
        error instanceof Error ? error.message : "Failed to connect.",
      );
      setPhase("error");
    }
  }, []);

  useEffect(() => {
    if (config && !startedRef.current) {
      startedRef.current = true;
      void boot(config);
    }
  }, [config, boot]);

  const handleLeaveCleanup = useCallback(
    (channel: string, agentId?: string) => {
      void fetch("/api/agent/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, agentId }),
        keepalive: true,
      }).catch(() => {});
      // Tear down RTM (owned here since we created it during boot).
      rtmClientRef.current?.logout().catch(() => {});
      rtmClientRef.current = null;
    },
    [],
  );

  if (!config || (phase === "booting" && !tokenData)) {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center bg-background px-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
          <p className="text-sm text-ink-muted">
            Connecting to the conversation…
          </p>
        </div>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-danger" />
          <h1 className="mt-4 text-lg font-semibold">{bootError}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            Check your connection, then try again.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => router.push("/setup")}>
              Back to setup
            </Button>
            <Button
              onClick={() => {
                setPhase("booting");
                void boot(config);
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (!tokenData || !rtmClient || !config) {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center bg-background px-6">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </main>
    );
  }

  return (
    <AgoraProvider>
      <ConversationView
        config={config}
        appId={tokenData.appId}
        uid={tokenData.uid}
        token={tokenData.token}
        agentId={agentInfo?.agentId}
        sessionId={agentInfo?.sessionId}
        vendors={agentInfo?.vendors}
        agentStartFailed={!agentInfo}
        rtmClient={rtmClient}
        onLeaveCleanup={(req) => handleLeaveCleanup(req.channel, req.agentId)}
      />
    </AgoraProvider>
  );
}
