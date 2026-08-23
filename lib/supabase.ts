import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DeliveryNoteRecord } from "@/lib/delivery-store";

/**
 * Returns a Supabase client when server-side env vars are configured,
 * otherwise null — the app degrades gracefully to the in-memory store.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

export async function insertDeliveryNote(
  client: SupabaseClient,
  record: DeliveryNoteRecord,
): Promise<void> {
  const { error } = await client.from("delivery_notes").insert({
    session_id: record.sessionId,
    channel: record.channel,
    instruction: record.instruction,
    translated_instruction: record.translatedInstruction,
    source_speaker: record.sourceSpeaker,
    source_lang: record.sourceLang,
  });
  if (error) throw new Error(error.message);
}
