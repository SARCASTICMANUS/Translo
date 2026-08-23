import { NextRequest, NextResponse } from "next/server";
import { Agent, AgoraClient, Area, ExpiresIn } from "agora-agents";
import { buildFailureMessage, buildGreeting, buildInterpreterPrompt } from "@/lib/ai/prompt";
import { resolveVendors } from "@/lib/ai/providers";
import { getLanguage, type Role } from "@/lib/languages";
import { getSession, saveSession } from "@/lib/session-registry";
import { randomUUID } from "crypto";

export const AGENT_UID = 123456;

interface StartAgentBody {
  channel: string;
  workerLang: string;
  customerLang: string;
  /** Role of the participant who triggered the start (informational). */
  startedBy?: Role;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as StartAgentBody;
    const channel = body.channel?.trim();
    const workerLang = body.workerLang ?? "hi";
    const customerLang = body.customerLang ?? "en";

    if (!channel) {
      return NextResponse.json({ error: "channel is required" }, { status: 400 });
    }
    if (!getLanguage(workerLang) || !getLanguage(customerLang)) {
      return NextResponse.json({ error: "invalid language" }, { status: 400 });
    }

    // Idempotent: never start a second agent for a live channel.
    const existing = getSession(channel);
    if (existing && Date.now() - existing.createdAt < 55 * 60 * 1000) {
      return NextResponse.json({
        agentId: existing.agentId,
        sessionId: existing.sessionId,
        state: "RUNNING",
        vendors: existing.vendors,
        alreadyRunning: true,
      });
    }

    const appId = requireEnv("NEXT_PUBLIC_AGORA_APP_ID");
    const appCertificate = requireEnv("NEXT_AGORA_APP_CERTIFICATE");

    const client = new AgoraClient({ area: Area.US, appId, appCertificate });
    const vendors = resolveVendors(workerLang, customerLang);

    const agent = new Agent({
      client,
      instructions: buildInterpreterPrompt(workerLang, customerLang),
      greeting: buildGreeting(workerLang, customerLang),
      failureMessage: buildFailureMessage(),
      maxHistory: 50,
      // Server-side VAD with aggressive interruption → real barge-in support.
      turnDetection: {
        config: {
          speech_threshold: 0.5,
          start_of_speech: {
            mode: "vad",
            vad_config: {
              interrupt_duration_ms: 160,
              prefix_padding_ms: 300,
            },
          },
          end_of_speech: {
            mode: "vad",
            vad_config: { silence_duration_ms: 480 },
          },
        },
      },
      advancedFeatures: { enable_rtm: true },
      parameters: {
        audio_scenario: "chorus",
        data_channel: "rtm",
        enable_error_message: true,
      },
    })
      .withStt(vendors.stt)
      .withLlm(vendors.llm)
      .withTts(vendors.tts);

    const session = agent.createSession({
      channel,
      agentUid: String(AGENT_UID),
      // Subscribe to every human microphone in the channel — both participants.
      remoteUids: ["*"],
      idleTimeout: 900,
      expiresIn: ExpiresIn.hours(1),
      debug: false,
    });

    const agentId = await session.start();

    const sessionId = randomUUID();
    const payload = {
      agentId,
      sessionId,
      state: "RUNNING",
      vendors: {
        stt: vendors.labels.stt,
        llm: vendors.labels.llm,
        tts: vendors.labels.tts,
        tier: vendors.tier,
      },
    };

    saveSession({
      agentId,
      sessionId,
      channel,
      workerLang,
      customerLang,
      vendors: payload.vendors,
      createdAt: Date.now(),
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Failed to start Translo agent:", error);
    const detail =
      error instanceof Error ? error.message : "Unknown error starting agent";
    return NextResponse.json(
      { error: `Could not start the AI interpreter. ${detail}` },
      { status: 500 },
    );
  }
}
