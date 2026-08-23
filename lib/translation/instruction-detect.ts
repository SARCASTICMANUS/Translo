import { getLanguage } from "@/lib/languages";
import type { Speaker } from "@/types";

/**
 * Heuristic detector for clear delivery instructions in finalized
 * conversation turns. Deliberately conservative: only fires when BOTH a
 * delivery-action cue AND an instruction-like structure are present.
 */

const ACTION_PATTERNS: RegExp[] = [
  // English
  /\b(leave|drop|keep|place|put|hand|give|deliver)\b.{0,40}\b(parcel|package|order|delivery|food|it|document|tiffin|groceries)?\b/i,
  /\b(parcels?|packages?|orders?|delivery|tiffin)\b/i,
  // Hindi (romanized + Devanagari)
  /\b(chhod|chhor|rakh|de\s?d[oe]|dena|de\d*na|saup|sonp|pahuncha)\b/i,
  /(छोड़|रखना|दे\s?दो|देना|सौंप|पार्सल)/,
  // Bengali
  /(রেখে|দিয়ে|পার্সেল)/,
  // Tamil
  /(விடுங்கள்|கொடுத்து|பார்சல்)/,
  // Telugu
  /(వదిలే|ఇవ్వండి|పార్సిల్)/,
  // Marathi
  /(सोडू|द्या|पार्सल)/,
];

const LOCATION_PATTERNS: RegExp[] = [
  /\b(gate|door|desk|security|reception|lobby|lift|elevator|floor|flat|room|office|counter|cabin|basement|terrace|parking)\b/i,
  /(गेट|डेस्क|सिक्योरिटी|रिसेप्शन|लॉबी|लिफ्ट|फ्लैट|दरवाज़ा|दरवाजा)/,
];

export interface DetectedInstruction {
  turnId: string;
  original: string;
  translated: string;
  speaker: Speaker;
  sourceLang: string;
}

/**
 * Returns a DetectedInstruction when the turn looks like a concrete delivery
 * instruction; null otherwise. `translated` is the agent's interpretation of
 * the same utterance (the paired agent turn).
 */
export function detectDeliveryInstruction(
  originalText: string,
  translatedText: string | null,
  sourceLangCode: string,
  speaker: Speaker,
  turnId: string,
): DetectedInstruction | null {
  const text = originalText.trim();
  if (text.length < 8) return null;

  const hasAction = ACTION_PATTERNS.some((re) => re.test(text));
  const hasLocation =
    LOCATION_PATTERNS.some((re) => re.test(text)) ||
    /\b(gate|flat|floor|room)\s*(number|#|no\.?)?\s*\d+/i.test(text);

  if (!hasAction || !hasLocation) return null;

  return {
    turnId,
    original: text,
    translated:
      translatedText?.trim() ??
      `Delivery instruction (${getLanguage(sourceLangCode).label}).`,
    speaker,
    sourceLang: sourceLangCode,
  };
}
