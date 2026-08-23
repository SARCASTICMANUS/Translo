import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session-registry";

export async function GET(request: NextRequest) {
  const channel = request.nextUrl.searchParams.get("channel")?.trim();
  if (!channel) {
    return NextResponse.json(
      { active: false, error: "channel is required" },
      { status: 400 },
    );
  }

  const session = getSession(channel);
  if (!session || Date.now() - session.createdAt > 55 * 60 * 1000) {
    return NextResponse.json({
      active: false,
      workerLang: "hi",
      customerLang: "en",
    });
  }

  return NextResponse.json({
    active: true,
    workerLang: session.workerLang,
    customerLang: session.customerLang,
    sessionId: session.sessionId,
    vendors: session.vendors,
  });
}
