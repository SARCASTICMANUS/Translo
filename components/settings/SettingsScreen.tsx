"use client";

import { useState } from "react";
import { ChevronRight, Info, Mic, Volume2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";
import { LanguagePickerSheet } from "@/components/language-picker/LanguagePickerSheet";
import { getLanguage } from "@/lib/languages";
import { usePreferences } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export function SettingsScreen() {
  const [prefs, updatePrefs] = usePreferences();
  const [languagePickerOpen, setLanguagePickerOpen] = useState(false);
  const myLang = getLanguage(prefs.myLanguage);

  return (
    <AppShell withNav>
      <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)]">
        <Logo />
      </header>

      <section className="px-5 pt-4 pb-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Make Translo work the way you do.
        </p>
      </section>

      <section className="flex flex-col gap-4 px-5 pt-3 pb-6">
        {/* Language */}
        <Card className="divide-y divide-line">
          <button
            type="button"
            onClick={() => setLanguagePickerOpen(true)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-surface-raised/60"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Mic className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">
                  {myLang.flag} {myLang.label}
                </span>
                <span className="block text-xs text-muted">
                  The language you speak in when calling
                </span>
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-faint" />
          </button>

          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-muted">
                <Volume2 className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">
                  Translo voice
                </span>
                <span className="block text-xs text-muted">
                  The voice that speaks the translation
                </span>
              </span>
            </span>
            <span className="flex overflow-hidden rounded-full border border-line">
              {(["male", "female"] as const).map((voice) => (
                <button
                  key={voice}
                  type="button"
                  onClick={() => updatePrefs({ voicePreference: voice })}
                  className={cn(
                    "px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
                    prefs.voicePreference === voice
                      ? "bg-accent-soft text-accent"
                      : "bg-transparent text-muted hover:text-foreground",
                  )}
                >
                  {voice}
                </button>
              ))}
            </span>
          </div>
        </Card>

        {/* Toggles */}
        <Card className="divide-y divide-line">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span>
              <span className="block text-sm font-medium text-foreground">
                Live captions
              </span>
              <span className="block text-xs text-muted">
                Show what&apos;s said during a call
              </span>
            </span>
            <Switch
              checked={prefs.liveCaptions}
              onChange={(next) => updatePrefs({ liveCaptions: next })}
              label="Live captions"
            />
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span>
              <span className="block text-sm font-medium text-foreground">
                Translation tip reminders
              </span>
              <span className="block text-xs text-muted">
                “Speak, then pause” coaching on calls
              </span>
            </span>
            <Switch
              checked={prefs.tipReminders}
              onChange={(next) => updatePrefs({ tipReminders: next })}
              label="Translation tip reminders"
            />
          </div>
        </Card>

        {/* About */}
        <Card className="p-5">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-accent">
            <Info className="h-3.5 w-3.5" /> How Translo works
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            When you call a customer, Translo connects the call and listens to
            both sides. Each line is spoken back in the other person&apos;s
            language — listen to what you said, then the translation follows.
            The customer just picks up a normal phone call.
          </p>
        </Card>

        <p className="px-2 text-center text-[11px] text-faint">
          Prototype — calls and translation are simulated. No real calls are
          placed.
        </p>
      </section>

      <LanguagePickerSheet
        open={languagePickerOpen}
        onClose={() => setLanguagePickerOpen(false)}
        selected={prefs.myLanguage}
        onSelect={(code) => updatePrefs({ myLanguage: code })}
      />
    </AppShell>
  );
}