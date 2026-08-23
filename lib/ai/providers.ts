import {
  DeepgramSTT,
  MicrosoftSTT,
  MicrosoftTTS,
  MiniMaxTTS,
  OpenAI,
  SarvamSTT,
  SarvamTTS,
} from "agora-agents";
import { getLanguage } from "@/lib/languages";

export interface VendorBundle {
  stt: InstanceType<typeof DeepgramSTT | typeof MicrosoftSTT | typeof SarvamSTT>;
  llm: OpenAI;
  tts: InstanceType<
    typeof MicrosoftTTS | typeof MiniMaxTTS | typeof SarvamTTS
  >;
  tier: string;
  labels: {
    stt: string;
    llm: string;
    tts: string;
  };
}

/**
 * Resolves the STT / LLM / TTS vendors from available environment variables.
 *
 * Priority (best experience first):
 *   1. Sarvam AI   — native Indic code-switching ASR (`unknown` = auto-detect)
 *   2. Azure       — multilingual neural TTS voice covers every supported pair
 *   3. Agora-managed resellers — zero extra keys: Deepgram nova-2 + OpenAI
 *      gpt-4o-mini + MiniMax. In this tier the ASR is tuned to the worker's
 *      language (the primary demo direction); reverse-direction speech still
 *      flows through the LLM but benefits from adding a Sarvam/Azure key.
 */
export function resolveVendors(
  workerLang: string,
  customerLang: string,
): VendorBundle {
  const sarvamKey = process.env.SARVAM_API_KEY;
  const azureKey = process.env.AZURE_SPEECH_KEY;
  const azureRegion = process.env.AZURE_SPEECH_REGION;

  // ---- STT ----
  let stt: VendorBundle["stt"];
  let sttLabel: string;
  if (sarvamKey) {
    stt = new SarvamSTT({ apiKey: sarvamKey, language: "unknown" });
    sttLabel = "sarvam (auto code-switch)";
  } else if (azureKey && azureRegion) {
    stt = new MicrosoftSTT({
      key: azureKey,
      region: azureRegion,
      language: getLanguage(workerLang).azureLocale,
    });
    sttLabel = `azure (${getLanguage(workerLang).azureLocale})`;
  } else {
    stt = new DeepgramSTT({
      model: "nova-2",
      language: getLanguage(workerLang).deepgram,
    });
    sttLabel = `deepgram nova-2 (${getLanguage(workerLang).deepgram}) [managed]`;
  }

  // ---- LLM (Agora-managed gpt-4o-mini unless BYOK provided) ----
  const byokLlmKey = process.env.NEXT_LLM_API_KEY;
  const byokLlmUrl = process.env.NEXT_LLM_URL;
  const llmModel = process.env.LLM_MODEL ?? "gpt-4o-mini";
  let llm: OpenAI;
  let llmLabel: string;
  if (byokLlmKey) {
    llm = new OpenAI({
      apiKey: byokLlmKey,
      url:
        byokLlmUrl ??
        "https://api.openai.com/v1/chat/completions",
      model: llmModel,
      maxHistory: 50,
      params: { temperature: 0.3, max_tokens: 512 },
    });
    llmLabel = `openai-compatible (${llmModel}) [byok]`;
  } else {
    llm = new OpenAI({
      model: "gpt-4o-mini",
      maxHistory: 50,
      params: { temperature: 0.3, max_tokens: 512 },
    });
    llmLabel = "openai gpt-4o-mini [managed]";
  }

  // ---- TTS ----
  let tts: VendorBundle["tts"];
  let ttsLabel: string;
  let tier: string;
  if (azureKey && azureRegion) {
    tts = new MicrosoftTTS({
      key: azureKey,
      region: azureRegion,
      voiceName:
        process.env.AZURE_TTS_VOICE ?? "en-US-AndrewMultilingualNeural",
      sampleRate: 24000,
    });
    ttsLabel = `azure (${
      process.env.AZURE_TTS_VOICE ?? "en-US-AndrewMultilingualNeural"
    })`;
    tier = sarvamKey ? "full-bilingual" : "bilingual-tts";
  } else if (sarvamKey) {
    tts = new SarvamTTS({
      key: sarvamKey,
      speaker: process.env.SARVAM_TTS_SPEAKER ?? "anushka",
      targetLanguageCode: getLanguage(customerLang).sarvamTts as never,
    });
    ttsLabel = `sarvam bulbul (${getLanguage(customerLang).sarvamTts})`;
    tier = "indic";
  } else {
    tts = new MiniMaxTTS({
      model: "speech_2_6_turbo",
      voiceId: process.env.MINIMAX_VOICE_ID ?? "English_captivating_female1",
    });
    ttsLabel = "minimax speech_2_6_turbo [managed]";
    tier = "managed";
  }

  return {
    stt,
    llm,
    tts,
    tier,
    labels: { stt: sttLabel, llm: llmLabel, tts: ttsLabel },
  };
}
