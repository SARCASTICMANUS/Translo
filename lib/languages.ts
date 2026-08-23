export type Role = "worker" | "customer";

export interface LanguageMeta {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
  /** Microsoft Azure speech locale */
  azureLocale: string;
  /** Deepgram language code */
  deepgram: string;
  /** Sarvam target_language_code */
  sarvamTts: string;
  /** Short label used inside the header pair, e.g. "Hindi ↔ English" */
  shortLabel: string;
}

export const LANGUAGES: Record<string, LanguageMeta> = {
  hi: {
    code: "hi",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    flag: "🇮🇳",
    azureLocale: "hi-IN",
    deepgram: "hi",
    sarvamTts: "hi-IN",
    shortLabel: "Hindi",
  },
  en: {
    code: "en",
    label: "English",
    nativeLabel: "English",
    flag: "🇬🇧",
    azureLocale: "en-IN",
    deepgram: "en",
    sarvamTts: "en-IN",
    shortLabel: "English",
  },
  bn: {
    code: "bn",
    label: "Bengali",
    nativeLabel: "বাংলা",
    flag: "🇮🇳",
    azureLocale: "bn-IN",
    deepgram: "bn",
    sarvamTts: "bn-IN",
    shortLabel: "Bengali",
  },
  ta: {
    code: "ta",
    label: "Tamil",
    nativeLabel: "தமிழ்",
    flag: "🇮🇳",
    azureLocale: "ta-IN",
    deepgram: "ta",
    sarvamTts: "ta-IN",
    shortLabel: "Tamil",
  },
  te: {
    code: "te",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    flag: "🇮🇳",
    azureLocale: "te-IN",
    deepgram: "te",
    sarvamTts: "te-IN",
    shortLabel: "Telugu",
  },
  mr: {
    code: "mr",
    label: "Marathi",
    nativeLabel: "मराठी",
    flag: "🇮🇳",
    azureLocale: "mr-IN",
    deepgram: "mr",
    sarvamTts: "mr-IN",
    shortLabel: "Marathi",
  },
};

export const LANGUAGE_LIST: LanguageMeta[] = Object.values(LANGUAGES);

export function getLanguage(code: string): LanguageMeta {
  return LANGUAGES[code] ?? LANGUAGES.en;
}

export function generateRoomCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
