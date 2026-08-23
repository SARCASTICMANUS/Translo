import type {
  Speaker,
  TranscriptGroup,
  TranscriptTurn,
  TurnStatusValue,
} from "@/types";

export const AGENT_UID = "123456";

/** Fixes compacted punctuation emitted by some ASR/TTS providers. */
export function normalizeTranscriptSpacing(text: string): string {
  return text
    .replace(/([.!?।])([^\s.!?।])/g, "$1 $2")
    .replace(/,([^\s,])/g, ", $1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function normalizeTimestampMs(timestamp: number): number {
  return timestamp > 1e12 ? timestamp : timestamp * 1000;
}

interface RawItem {
  uid: string;
  turn_id: number;
  _time: number;
  text: string;
  status: number; // toolkit TurnStatus: 0 in-progress, 1 end, 2 interrupted
}

function toStatus(status: number): TurnStatusValue {
  if (status === 0) return "in-progress";
  if (status === 2) return "interrupted";
  return "end";
}

export interface RoleMapping {
  myUid: string;
  myRole: Speaker;
  otherRole: Speaker;
}

/**
 * Converts raw toolkit transcript items into normalized turns and pairs each
 * human utterance with the agent interpretation(s) that follow it.
 */
export function buildTranscriptGroups(
  items: RawItem[],
  roles: RoleMapping,
  workerLang: string,
  customerLang: string,
): TranscriptGroup[] {
  const myUid = String(roles.myUid);

  const turns: TranscriptTurn[] = items.map((item) => {
    const uid = item.uid === "0" ? myUid : String(item.uid);
    let speaker: Speaker;
    if (uid === AGENT_UID) speaker = "translo";
    else if (uid === myUid) speaker = roles.myRole;
    else speaker = roles.otherRole;

    return {
      id: `${uid}-${item.turn_id}`,
      speaker,
      langCode:
        speaker === "translo"
          ? "" // filled per group below
          : speaker === "worker"
            ? workerLang
            : customerLang,
      text: normalizeTranscriptSpacing(item.text ?? ""),
      status: toStatus(item.status),
      timestampMs: normalizeTimestampMs(item._time ?? Date.now()),
    };
  });

  const groups: TranscriptGroup[] = [];
  let current: TranscriptGroup | null = null;

  for (const turn of turns) {
    if (turn.speaker === "translo") {
      const target =
        current?.speaker === "worker" ? customerLang : workerLang;
      if (current && !current.translationLocked) {
        // Attach the agent's interpretation of the pending utterance.
        if (current.translation === null) {
          current.translation = { ...turn, langCode: target };
          current.translationParts = [turn];
        } else {
          current.translationParts!.push(turn);
          current.translation = {
            ...turn,
            langCode: target,
            text: current
              .translationParts!.map((t) => t.text)
              .filter(Boolean)
              .join(" "),
            status: current.translationParts!.some(
              (t) => t.status === "in-progress",
            )
              ? "in-progress"
              : turn.status,
          };
        }
      } else {
        // Standalone agent line (greeting / clarification addressed to all).
        groups.push({
          id: `agent-${turn.id}`,
          speaker: "translo",
          sourceLang: "",
          targetLang: "",
          original: { ...turn, speaker: "translo", langCode: "" },
          translation: null,
        });
      }
    } else {
      if (current) {
        current.translationLocked = true;
        groups.push(current);
      }
      current = {
        id: turn.id,
        speaker: turn.speaker,
        sourceLang: turn.langCode,
        targetLang: turn.speaker === "worker" ? customerLang : workerLang,
        original: turn,
        translation: null,
        translationLocked: false,
        translationParts: [],
      };
    }
  }
  if (current) groups.push(current);

  return groups.filter((g) => g.original.text.length > 0);
}
