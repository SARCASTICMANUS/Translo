# TRANSLO

**Talk in your language. Be understood in theirs.**

Real-time AI voice communication for a world that speaks many languages.
Initial use case: helping gig workers and customers communicate naturally
across language barriers.

Translo is **not** a text translator — it is a real-time conversational
communication bridge built on **Agora Conversational AI Engine**:

```
Worker mic → Agora RTC → ConvoAI Agent (ASR → LLM → TTS) → Agora → Customer speaker
```

Both directions run live over voice, with barge-in, shared context memory,
code-switching, and an optional external action (delivery notes).

---

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in your Agora credentials
npm run dev
```

Open http://localhost:3000.

### Required environment

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_AGORA_APP_ID` | Agora Console → Project details |
| `NEXT_AGORA_APP_CERTIFICATE` | Agora Console → Project details (server-only) |

That is all you need. The interpreter runs entirely on **Agora-managed
vendors**, billed through your Agora account with zero extra API keys:

| Stage | Vendor | Notes |
| --- | --- | --- |
| STT | Deepgram nova-2 `multi` | Code-switches between English and major Indian languages — both sides transcribe cleanly |
| LLM | OpenAI gpt-4o-mini | Shared context window for the whole conversation |
| TTS | OpenAI tts-1 (default voice `onyx`) | Multilingual voice; override with `OPENAI_TTS_VOICE` |

### Optional persistence (delivery notes)

Without Supabase, delivery notes persist in server memory (fine for demos).
To persist durably, set `NEXT_PUBLIC_SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` (server-only) and create the table:

```sql
create table if not exists delivery_notes (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  channel text,
  instruction text not null,
  translated_instruction text,
  source_speaker text,
  source_lang text,
  created_at timestamptz not null default now()
);
```

Secrets never reach the client: the Agora certificate lives in a server-side
env var and is used only inside API routes.

---

## The 60-second demo

1. Open `/setup`. Join as **Worker**, worker language **Hindi**, customer
   language **English**. Create room — share the code (or open a second
   device/browser and join as **Customer** with that code).
2. Press **Start Live Conversation** on both sides. Wait for the LIVE badge
   and the bilingual greeting from Translo.
3. Worker says: *"Main gate number 2 pe hoon."* → customer hears:
   "I'm at gate number 2."
4. Customer says: *"Please come to the security desk."* → worker hears the
   Hindi equivalent.
5. **Barge-in:** start speaking while Translo is still talking — it stops and
   follows the new input.
6. Say a clear instruction: *"Parcel security desk pe chhod do."* → Translo
   detects it, asks **Create this delivery note?** → **Confirm** →
   **Delivery Note Created ✓** (persisted via `/api/delivery-note`).

Dev panel: press **D** (or click the bug icon) during a live call to inspect
connection state, agent state, UIDs, session ID, vendors, and last event.

## Architecture

```
app/
  page.tsx                  landing
  setup/page.tsx            role/language/room setup + mic preflight
  conversation/page.tsx     live call (browser-only mount)
  api/agora/token           RTC+RTM token (AccessToken2, buildTokenWithRtm)
  api/agent/start           starts ConvoAI interpreter (AgentKit, idempotent)
  api/agent/session         second-participant discovery of the live pair
  api/agent/stop            idempotent agent shutdown
  api/delivery-note         persists confirmed delivery instructions
components/
  landing/ setup/ live/ transcript/ language-selector/ audio-status/ delivery-note/ dev/
lib/
  agora/                    transcript normalization/grouping, volume store
  ai/                       interpreter prompt builder + vendor resolution
  translation/              conservative delivery-instruction detection
  supabase.ts delivery-store.ts session-registry.ts
```

One ConvoAI agent joins the channel per session and subscribes to all human
microphones (`remoteUids: ["*"]`), so both parties share one context window —
that is what makes "which gate are you at?" work without repeating yourself.
Server VAD with a 160 ms interrupt threshold provides true barge-in;
transcripts and agent state stream to the browser over RTM through
`agora-agent-client-toolkit`.
