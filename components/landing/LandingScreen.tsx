"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { FlowDiagram } from "./FlowDiagram";

export default function LandingScreen() {
  return (
    <main className="flex-1 flex flex-col items-center px-6 pb-16">
      <header className="w-full max-w-5xl flex items-center justify-between py-6">
        <Logo />
        <span className="hidden sm:inline text-xs uppercase tracking-widest text-ink-muted">
          Real-time voice bridge
        </span>
      </header>

      <section className="mt-10 md:mt-16 flex flex-col items-center text-center max-w-3xl animate-fade-up">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.08]">
          Talk in your language.
          <br />
          <span className="text-brand">Be understood in theirs.</span>
        </h1>

        <p className="mt-6 text-base md:text-lg text-ink-muted max-w-xl leading-relaxed">
          Real-time AI voice communication that lets people speak naturally in
          their own language.
        </p>

        <div className="mt-9 flex flex-col sm:flex-row items-center gap-3">
          <Link href="/setup">
            <Button size="lg" className="w-full sm:w-auto">
              Start Conversation
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              See How It Works
            </Button>
          </a>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mt-16 md:mt-24 w-full max-w-3xl rounded-3xl border border-line bg-card px-6 py-10 md:px-12"
      >
        <FlowDiagram />
        <p className="mt-10 text-center text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
          A gig worker speaks Hindi. Their customer hears English — instantly,
          by voice. No typing, no apps to learn. Just a conversation.
        </p>
      </section>

      <footer className="mt-16 text-xs text-ink-muted">
        Translo — a real-time conversational communication bridge, built on
        Agora Conversational AI.
      </footer>
    </main>
  );
}
