import { useState, useEffect, useRef, useCallback } from 'react';
import { TransloCallClient, TranscriptMessage, AgentCredentials, IRemoteAudioTrack } from './index';

export const DEFAULT_BASE = 'http://localhost:8080';

/**
 * Call the backend to launch the AI agent and fetch all connection creds.
 * Wire this to your CALL button.
 */
export async function fetchAgentCredentials(
  channelName: string,
  opts?: { baseUrl?: string; mode?: 'backend-bridge' | 'agora-conversation-engine' },
): Promise<AgentCredentials> {
  const base = opts?.baseUrl ?? DEFAULT_BASE;
  const res = await fetch(`${base}/api/start-ai-agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelName, mode: opts?.mode ?? 'backend-bridge' }),
  });
  if (!res.ok) throw new Error(`start-ai-agent failed: ${res.status}`);
  const json = (await res.json()) as { credentials: AgentCredentials };
  return json.credentials;
}

export interface TransloCallHandles {
  start: (channelName: string) => Promise<void>;
  end: () => void;
  toggleMute: () => Promise<void>;
  transcript: TranscriptMessage[];
  connected: boolean;
  muted: boolean;
  attachAgentAudio: (track: IRemoteAudioTrack) => void;
}

/**
 * React hook wrapping TransloCallClient. Returns state + imperative helpers.
 *
 *   const call = useTransloCall({ baseUrl });
 *   await call.start('call_AB12');        // your CALL button
 *   <button onClick={call.toggleMute}>Mute</button>
 *   {call.transcript.map(m => <Bubble key={m.id} ... />)}
 */
export function useTransloCall(opts?: { baseUrl?: string }): TransloCallHandles {
  const clientRef = useRef<TransloCallClient | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);

  if (!clientRef.current) {
    clientRef.current = new TransloCallClient({
      onTranscript: setTranscript,
      onConnected: (uid) => {
        setConnected(true);
        console.log('[translo] connected to channel uid', uid);
      },
      onDisconnected: (reason) => {
        setConnected(false);
        console.warn('[translo] disconnected', reason);
      },
      onError: (code, msg) => console.error(`[translo] rtc error ${code}`, msg),
    });
  }
  const client = clientRef.current;

  const start = useCallback(
    async (channelName: string) => {
      const credentials = await fetchAgentCredentials(channelName, {
        baseUrl: opts?.baseUrl,
      });
      await client.connect(credentials);
    },
    [client, opts?.baseUrl],
  );

  const toggleMute = useCallback(async () => {
    setMuted(await client.toggleMute());
  }, [client]);

  const end = useCallback(() => {
    void client.leave();
    setConnected(false);
  }, [client]);

  const attachAgentAudio = useCallback(
    (track: IRemoteAudioTrack) => {
      track.play();
      track.setVolume(100);
    },
    [],
  );

  useEffect(() => {
    const c = client;
    return () => c.destroy();
  }, [client]);

  return { start, end, toggleMute, transcript, connected, muted, attachAgentAudio };
}
