"use client";

import { useEffect, useState } from "react";
import type { Preferences } from "@/types";
import { WORKER_DEFAULT_LANGUAGE } from "@/lib/languages";

const STORAGE_KEY = "translo_prefs";

export const DEFAULT_PREFERENCES: Preferences = {
  myLanguage: WORKER_DEFAULT_LANGUAGE,
  voicePreference: "male",
  liveCaptions: true,
  tipReminders: true,
  seenCoachingTip: false,
};

let cache: Preferences | null = null;
const listeners = new Set<(prefs: Preferences) => void>();

function read(): Preferences {
  if (cache) return cache;
  const fallback = { ...DEFAULT_PREFERENCES };
  cache = fallback;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) cache = { ...fallback, ...JSON.parse(raw) };
    } catch {
      /* mock store — corrupted value falls back to defaults */
    }
  }
  return cache ?? fallback;
}

function write(patch: Partial<Preferences>): Preferences {
  const next = { ...read(), ...patch };
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* mock store — never throws in the UI */
    }
  }
  listeners.forEach((listener) => listener(next));
  return next;
}

/** Session-scoped mock preferences shared across screens. No backend. */
export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => read());

  useEffect(() => {
    const listener = (next: Preferences) => setPrefs(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const update = (patch: Partial<Preferences>) => write(patch);

  return [prefs, update] as const;
}