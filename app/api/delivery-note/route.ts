import { NextRequest, NextResponse } from "next/server";
import { saveDeliveryNote, type DeliveryNoteRecord } from "@/lib/delivery-store";

interface CreateNoteBody {
  sessionId: string;
  channel: string;
  instruction: string;
  translatedInstruction: string;
  sourceSpeaker: string;
  sourceLang: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateNoteBody;

    if (!body.sessionId || !body.instruction?.trim()) {
      return NextResponse.json(
        { error: "sessionId and instruction are required" },
        { status: 400 },
      );
    }

    const record: DeliveryNoteRecord = {
      sessionId: body.sessionId,
      channel: body.channel ?? "",
      instruction: body.instruction.trim(),
      translatedInstruction: body.translatedInstruction?.trim() ?? "",
      sourceSpeaker: body.sourceSpeaker ?? "unknown",
      sourceLang: body.sourceLang ?? "",
    };

    const note = await saveDeliveryNote(record);

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Failed to create delivery note:", error);
    return NextResponse.json(
      { error: "Could not create delivery note." },
      { status: 500 },
    );
  }
}
