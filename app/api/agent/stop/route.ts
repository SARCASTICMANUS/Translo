import { NextRequest, NextResponse } from "next/server";
import { AgoraClient, Area } from "agora-agents";
import { removeSession } from "@/lib/session-registry";

function isAlreadyStopped(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as {
    statusCode?: number;
    body?: { detail?: string; reason?: string };
    message?: string;
  };
  if (e.statusCode === 404) return true;
  const detail = (
    e.body?.detail ??
    e.body?.reason ??
    e.message ??
    ""
  ).toLowerCase();
  return detail.includes("already in the process of shutting down");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { channel: string; agentId?: string };
    const channel = body.channel?.trim();

    if (!channel) {
      return NextResponse.json({ error: "channel is required" }, { status: 400 });
    }

    const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
    const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;

    if (appId && appCertificate && body.agentId) {
      const client = new AgoraClient({ area: Area.US, appId, appCertificate });
      try {
        await client.stopAgent(body.agentId);
      } catch (error) {
        if (!isAlreadyStopped(error)) throw error;
      }
    }

    removeSession(channel);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to stop agent:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stop failed" },
      { status: 500 },
    );
  }
}
