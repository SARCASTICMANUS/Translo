import type { DeliveryNote } from "@/types";
import { getSupabase, insertDeliveryNote } from "@/lib/supabase";

export interface DeliveryNoteRecord {
  sessionId: string;
  channel: string;
  instruction: string;
  translatedInstruction: string;
  sourceSpeaker: string;
  sourceLang: string;
}

const globalStore = globalThis as unknown as {
  __transloNotes?: DeliveryNote[];
};

const notes: DeliveryNote[] = globalStore.__transloNotes ?? [];
globalStore.__transloNotes = notes;

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Persists a delivery note. Uses Supabase when configured (server-side
 * service-role key); otherwise falls back to an in-memory store so the demo
 * always works.
 */
export async function saveDeliveryNote(
  record: DeliveryNoteRecord,
): Promise<DeliveryNote> {
  const note: DeliveryNote = {
    id: makeId(),
    sessionId: record.sessionId,
    channel: record.channel,
    instruction: record.instruction,
    translatedInstruction: record.translatedInstruction,
    sourceSpeaker: record.sourceSpeaker as DeliveryNote["sourceSpeaker"],
    sourceLang: record.sourceLang,
    createdAt: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      await insertDeliveryNote(supabase, record);
      note.id = note.id; // DB generates its own row; keep local id for UI
    } catch (error) {
      console.error(
        "Supabase insert failed — falling back to in-memory store:",
        error,
      );
      notes.push(note);
      return note;
    }
  } else {
    notes.push(note);
  }

  return note;
}
