import AgoraRTC, {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  UID,
} from 'agora-rtc-sdk-ng';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface AgentCredentials {
  appId: string;
  channelName: string;
  clientUid: number;
  clientRtcToken: string;
  agentUid: number;
  agentRtcToken: string;
  rtmToken: string;
  openai: {
    model: string;
    systemPrompt: string;
  };
}

/** Sender of a transcript segment. */
export type TranscriptSender = 'user' | 'agent';

/** A single chat message rendered as a bubble. */
export interface TranscriptMessage {
  id: string;
  sender: TranscriptSender;
  /** Final text once the engine decides the sentence is complete. */
  final: string;
  /** Live partial text that replaces the bubble content while speaking. */
  partial: string;
  startedAt: number;
  endedAt?: number;
}

/**
 * A chunk received from the transcript transport. The engine enriches each
 * chunk with `isFinal` so we can append partials smoothly and only commit a
 * bubble when the sentence completes — no UI flicker.
 */
interface TranscriptChunk {
  sender: TranscriptSender;
  text: string;
  isFinal: boolean;
  ts: number;
}

export interface TransloCallCallbacks {
  onUserJoined?: (uid: UID) => void;
  onUserLeft?: (uid: UID) => void;
  onTranscript?: (messages: TranscriptMessage[]) => void;
  onConnected?: (uid: UID) => void;
  onDisconnected?: (reason?: string) => void;
  onError?: (code: number, message: string) => void;
}

// -----------------------------------------------------------------------------
// Transcript accumulation with isFinal chunking
//
// The transcript extension streams JSON "delta" chunks over the RTC data
// channel. Each chunk has `isFinal`:
//   - true  => commit the sentence as a new (or completed) bubble.
//   - false => update the currently open partial bubble — never append a new
//              one. This keeps the WhatsApp-style chat from flickering.
// -----------------------------------------------------------------------------

class TranscriptStore {
  private messages: TranscriptMessage[] = [];
  private partialIndex = -1;

  constructor(private emit: (m: TranscriptMessage[]) => void) {}

  push(chunk: TranscriptChunk) {
    if (chunk.isFinal) {
      if (
        this.partialIndex >= 0 &&
        this.messages[this.partialIndex].sender === chunk.sender
      ) {
        const open = this.messages[this.partialIndex];
        open.final = open.final + chunk.text;
        open.partial = '';
        open.endedAt = chunk.ts;
        this.partialIndex = -1;
        this.emit([...this.messages]);
        return;
      }
      this.messages.push({
        id: `msg-${chunk.ts}-${this.messages.length}`,
        sender: chunk.sender,
        final: chunk.text,
        partial: '',
        startedAt: chunk.ts,
        endedAt: chunk.ts,
      });
      this.partialIndex = -1;
      this.emit([...this.messages]);
      return;
    }

    if (
      this.partialIndex >= 0 &&
      this.messages[this.partialIndex].sender === chunk.sender
    ) {
      this.messages[this.partialIndex].partial += chunk.text;
    } else {
      this.partialIndex = this.messages.length;
      this.messages.push({
        id: `msg-${chunk.ts}-${this.messages.length}`,
        sender: chunk.sender,
        final: '',
        partial: chunk.text,
        startedAt: chunk.ts,
      });
    }
    this.emit([...this.messages]);
  }

  clear() {
    this.messages = [];
    this.partialIndex = -1;
  }
}

// -----------------------------------------------------------------------------
// Transcript chunk wire format helpers.
//
// Both sides agree on a tiny JSON envelope so we know which publisher produced
// the text (user vs agent) and whether it's final. The agent authors chunks
// with this shape.
// -----------------------------------------------------------------------------
const FINAL_SUFFIX = '\u0003'; // ETX marker appended on final chunks

function decodeChunk(raw: string): TranscriptChunk | null {
  // Strip a trailing final marker if present.
  const final = raw.endsWith(FINAL_SUFFIX);
  const body = final ? raw.slice(0, -1) : raw;
  try {
    const parsed = JSON.parse(body) as { s?: TranscriptSender; t?: string; f?: boolean };
    if (!parsed.s || typeof parsed.t !== 'string') return null;
    return {
      sender: parsed.s === 'agent' ? 'agent' : 'user',
      text: parsed.t,
      isFinal: final ?? parsed.f ?? false,
      ts: Date.now(),
    };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Call client
// -----------------------------------------------------------------------------

export class TransloCallClient {
  private rtcClient: IAgoraRTCClient;
  private micTrack: IMicrophoneAudioTrack | null = null;
  private transcript: TranscriptStore;
  private callbacks: TransloCallCallbacks;
  private joined = false;

  constructor(callbacks: TransloCallCallbacks = {}) {
    this.callbacks = callbacks;
    this.transcript = new TranscriptStore((m) => callbacks.onTranscript?.(m));
    this.rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    this.bindRtcEvents();
  }

  /** Fetch credentials from the backend, join RTC, publish mic + subscribe to
   *  the agent's audio and live transcript. Wire this to your CALL button. */
  async connect(credentials: AgentCredentials): Promise<void> {
    if (this.joined) await this.leave();

    // 1) Capture the caller's mic — this audio is sent to the AI agent.
    this.micTrack = await AgoraRTC.createMicrophoneAudioTrack();

    // 2) Join the voice channel (SD-RTN media path).
    await this.rtcClient.join(
      credentials.appId,
      credentials.channelName,
      credentials.clientRtcToken || null,
      credentials.clientUid,
    );

    // 3) Publish our mic so the agent can hear us.
    await this.rtcClient.publish([this.micTrack]);

    this.joined = true;
    this.callbacks.onConnected?.(credentials.clientUid);
  }

  // --- RTC event binding ------------------------------------------------

  private bindRtcEvents() {
    this.rtcClient.on('user-joined', (user) => {
      this.callbacks.onUserJoined?.(user.uid);
    });

    this.rtcClient.on('user-left', (user) => {
      this.callbacks.onUserLeft?.(user.uid);
    });

    // Remote audio = the AI agent's reply. Subscribe + play it back.
    this.rtcClient.on('user-published', async (user, mediaType) => {
      if (mediaType !== 'audio') return;
      await this.rtcClient.subscribe(user, mediaType);
      if (user.audioTrack) {
        user.audioTrack.play();
        user.audioTrack.setVolume(100);
      }
    });

    this.rtcClient.on('user-unpublished', (user, mediaType) => {
      if (mediaType === 'audio') user.audioTrack?.stop();
    });

    // Live subtitles arrive as RTC data-channel messages from the agent.
    this.rtcClient.on('stream-message', (_uid, data) => {
      const text = typeof data === 'string' ? data : new TextDecoder().decode(data as Uint8Array);
      const chunk = decodeChunk(text);
      if (!chunk) return;
      this.transcript.push(chunk);
    });

    this.rtcClient.on('connection-state-change', (cur) => {
      // Close out disconnected states so the UI can offer a retry.
      if (cur === 'DISCONNECTED') {
        this.callbacks.onDisconnected?.(cur);
      }
    });

    // Handle token-expiry by refreshing (optional; requires a callback).
    this.rtcClient.on('token-privilege-will-expire', async () => {
      // If you wire an /api/credentials refresh, renew here:
      // const creds = await refreshCredentials(); await this.renewToken(creds);
    });
  }

  // --- Controls ----------------------------------------------------------

  async toggleMute(): Promise<boolean> {
    if (!this.micTrack) return false;
    const next = !this.micTrack.muted;
    await this.micTrack.setMuted(next);
    return next;
  }

  async leave(): Promise<void> {
    this.rtcClient.remoteUsers.forEach((u) => u.audioTrack?.stop());
    if (this.rtcClient.connectionState !== 'DISCONNECTED') {
      await this.rtcClient.leave();
    }
    this.micTrack?.close();
    this.micTrack = null;
    this.joined = false;
    this.transcript.clear();
  }

  destroy() {
    void this.leave();
    this.rtcClient.removeAllListeners();
  }
}

export type { IRemoteAudioTrack };
