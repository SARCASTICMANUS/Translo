import type { AgentStartResponse } from "@/types";

export interface LiveSession {
  agentId: string;
  sessionId: string;
  channel: string;
  workerLang: string;
  customerLang: string;
  vendors: AgentStartResponse["vendors"];
  createdAt: number;
}

/**
 * Small in-memory registry so the second participant can discover the live
 * session and the agent is never started twice for one channel. Survives HMR
 * via globalThis; intentionally not durable — the Agora ConvoAI service owns
 * the real session lifecycle.
 */
const globalStore = globalThis as unknown as {
  __transloSessions?: Map<string, LiveSession>;
};

const sessions: Map<string, LiveSession> =
  globalStore.__transloSessions ?? new Map();
globalStore.__transloSessions = sessions;

export function saveSession(session: LiveSession): void {
  sessions.set(session.channel, session);
}

export function getSession(channel: string): LiveSession | undefined {
  return sessions.get(channel);
}

export function removeSession(channel: string): void {
  sessions.delete(channel);
}
