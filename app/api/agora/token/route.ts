import { NextRequest, NextResponse } from "next/server";
import { RtcTokenBuilder, RtcRole } from "agora-token";

const EXPIRATION_IN_SECONDS = 3600;

function randomUid(): string {
  return String(Math.floor(Math.random() * 9_999_000) + 1000);
}

export async function POST(request: NextRequest) {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const appCertificate = process.env.NEXT_AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    return NextResponse.json(
      {
        error:
          "Agora credentials missing. Set NEXT_PUBLIC_AGORA_APP_ID and NEXT_AGORA_APP_CERTIFICATE in .env.local.",
      },
      { status: 500 },
    );
  }

  let body: { channel?: string; uid?: string } = {};
  try {
    body = await request.json();
  } catch {
    // empty body allowed — server assigns channel + uid
  }

  const channel = body.channel?.trim();
  const uid = body.uid?.trim() || randomUid();

  if (!channel || !/^[a-zA-Z0-9_-]{3,64}$/.test(channel)) {
    return NextResponse.json(
      { error: "channel is required (3–64 chars: letters, numbers, - _)" },
      { status: 400 },
    );
  }

  try {
    const expirationSeconds =
      Math.floor(Date.now() / 1000) + EXPIRATION_IN_SECONDS;
    // One token covers both RTC and RTM login (RTM carries transcript events).
    const token = RtcTokenBuilder.buildTokenWithRtm(
      appId,
      appCertificate,
      channel,
      uid,
      RtcRole.PUBLISHER,
      expirationSeconds,
      expirationSeconds,
    );

    return NextResponse.json({ appId, channel, uid, token });
  } catch (error) {
    console.error("Token generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate Agora token." },
      { status: 500 },
    );
  }
}
