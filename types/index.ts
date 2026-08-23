import type { Role } from "@/lib/languages";

export interface SessionConfig {
  channel: string;
  role: Role;
  workerLang: string;
  customerLang: string;
}

export interface TokenResponse {
  appId: string;
  channel: string;
  uid: string;
  token: string;
}

export interface AgentStartResponse {
  agentId: string;
  sessionId: string;
  state: string;
  vendors: {
    stt: string;
    llm: string;
    tts: string;
    tier: string;
  };
  alreadyRunning?: boolean;
}

export interface AgentStopRequest {
  channel: string;
  agentId?: string;
}

export interface SessionInfoResponse {
  active: boolean;
  workerLang: string;
  customerLang: string;
  sessionId?: string;
}

export type Speaker = "worker" | "customer" | "translo";

export type TurnStatusValue = "in-progress" | "end" | "interrupted";

export interface TranscriptTurn {
  id: string;
  speaker: Speaker;
  langCode: string;
  text: string;
  status: TurnStatusValue;
  timestampMs: number;
}

/** A user utterance paired with the agent's spoken translation of it. */
export interface TranscriptGroup {
  id: string;
  speaker: Speaker; // who spoke the original
  sourceLang: string; // language code of the original
  targetLang: string; // language code of the translation
  original: TranscriptTurn;
  translation: TranscriptTurn | null;
  /** Internal grouping state (not rendered directly). */
  translationLocked?: boolean;
  translationParts?: TranscriptTurn[];
}

export interface DeliveryNote {
  id: string;
  sessionId: string;
  channel: string;
  instruction: string;
  translatedInstruction: string;
  sourceSpeaker: Speaker;
  sourceLang: string;
  createdAt: string;
}
