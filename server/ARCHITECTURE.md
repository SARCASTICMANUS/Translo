# TRANSLO — Real-time AI Calling Architecture

Zero-carrier, free in-app calling + AI voice agent + live subtitles, built on
**Agora SD-RTN** and **OpenAI Realtime (Audio-to-Audio LLM)**.

This document traces every packet from the **user's microphone**, through Agora
and OpenAI, back to the **user's ear** and the **chat bubbles**. It maps cleanly
to the code in `server/` and `web-client/`.

---

## 1. System components

```
┌────────────────────┐   SD-RTN (media)   ┌─────────────────────┐
│  Web/React Client  │ ◄────────────────► │  Agora Cloud (RTC)  │
│  - Mic publish     │                    │  (low-latency SFU)  │
│  - Audio subscribe │                    └──────────▲──────────┘
│  - Chat UI         │                               │ WebRTC audio
└─────────┬──────────┘                               │ (agent egress)
          │  HTTPS /api/start-ai-agent               │
          │  (credentials + token)                   │
──────────▼──────────────────────────────────────────┼───────────────────
          │                                ┌─────────┴─────────┐
   ┌──────▼──────┐   WebSocket + RTP        │   Agent process   │
   │   Backend   │ ◄──────────────────────► │  (server/bridge)  │
   │  (Express)  │   audio relay            └─────────┬─────────┘
   └──────┬──────┘                                    │ WebSocket
          │                                           │ (OpenAI Realtime)
   OpenID / JWT auth                      ┌───────────▼───────────┐
                                          │   OpenAI Realtime API  │
                                          │  gpt-4o-realtime-preview│
                                          └───────────────────────────┘
```

Key idea: **the user only ever talks to Agora's media plane.** The heavy
translation brain (OpenAI) lives behind the backend bridge. This keeps latency
to the wire (WebRTC RTP ↔ WebSocket frames) with no carrier gateways.

---

## 2. The call lifecycle (step by step)

### Phase 0 — CALL pressed
1. The user taps CALL in the dialpad.
2. The client POSTs `{ channelName, mode }` to `/api/start-ai-agent`.
3. The backend:
   - Generates a unique `channelName` (e.g. `call_AB12`).
   - Picks a `clientUid` and an `agentUid`.
   - Issues an **RTC token** and an **RTM token** via `TokenService`
     (`agora-token`).
   - **Launches the Agent** (`AgentService.startAgent`):
     - **Mode A (default, self-managed):** prepares a backend media bridge that
       will attach an OpenAI Realtime session.
     - **Mode B (Agora Conversation AI Engine):** calls Agora's managed REST
       API to start a cloud agent pre-wired to OpenAI Realtime + a transcript
       extension.
   - Returns every credential the client needs.

### Phase 1 — Client joins the voice channel
```
client.join(appId, channelName, rtcToken, clientUid)
client.publish([micTrack])          // caller's voice -> SD-RTN
```
The client also listens for the **agent's published audio** and the
**transcript data channel**.

### Phase 2 — Agent bridges audio to OpenAI
- The agent subscribes to the caller's audio on the same RTC channel.
- It decodes the incoming RTP audio (Opus) and **forwards it into the OpenAI
  Realtime session over WebSocket**.
- OpenAI's model:
  1. Transcribes + translates the incoming audio (STT + translation).
  2. Reasons with the injected **system prompt** (dynamic language matching,
     interruption handling, 1–2 sentence replies).
  3. Synthesizes audio (TTS) and streams it back over the Realtime WebSocket.

### Phase 3 — Agent relays the reply to the user's ear
- The agent receives OpenAI's reply audio frames, encodes them as Opus and
  publishes to the same Agora channel.
- The client's `user-published` handler subscribes and calls `audioTrack.play()`
  → the user **hears** the AI respond, in the language it detected.

### Phase 4 — Subtitles stream to the chat UI
- While audio flows in both directions, a transcription of **both** speakers is
  produced (STT of the user + the final text the AI said).
- Each utterance is emitted as a **JSON chunk** on the RTC **data channel**
  (`stream-message`), tagged with `sender` and `isFinal`.
- The client's `stream-message` handler decodes the chunk and feeds it to a
  `TranscriptStore`, which:
  - appends **partial** text to the currently open bubble (no flicker), and
  - commits a **final** bubble only when the engine signals the sentence is
    complete.
- The React hook re-emits `transcript` so the WhatsApp-style chat re-renders.

---

## 3. Packet path: User mic → OpenAI → Ear + Chat

```
 [User's mic]
     │  captures PCM @48kHz, Opus-encoded by browser
     ▼
 [WebRTC RTP] ──SRTP over UDP──▶ Agora SD-RTN edge (lowest RTT PoP)
     │
     ▼
 [Agora Cloud SFU]  (routes to channel subscribers = the agent)
     │
     ▼
 [Agent RTC sub]  decodes Opus ▶ PCM
     ├────────────▶ ① STT/translation
     │                 │
     │                 ▼
     │          [OpenAI Realtime]  ── text (dialog) ──▶ system prompt logic
     │                 │           └─ TTS synth ──────▶ audio frames (PCM)
     │                 ▼
     ├────────────▶ ② reply PCM ── Opus encode ── publish to RTC channel
     │
     ▼
 [Client audio sub]  subscribe + audioTrack.play()  ──▶ User's ear 🔊
     │
     └────────────▶ transcript JSON chunks (stream-message) ──▶ Chat UI 💬
```

**Latency budget (target: < ~800 ms E2E):**
- Mic → Agora edge: 30–80 ms (SD-RTN global PoP)
- Agora → agent: ~20–50 ms
- Agent → OpenAI Realtime round-trip (audio in + first response): 150–400 ms
  (realtime model is streaming; first token can arrive before audio completes)
- Agent → user ear: ~20–50 ms
- Total: mostly bounded by OpenAI's Realtime latency, which is why we keep the
  bridge thin and never transcode more than Opus→PCM→Opus.

---

## 4. Security & production hardening

- **Never issue tokens client-side.** The RTC/RTM tokens are minted on the
  backend (`TokenService`) and revoked per-session. App Certificate stays server
  only.
- **HTTPS** for the `/api` endpoints; WSS for OpenAI.
- **Rate-limit** `/api/start-ai-agent` per user to prevent channel-flooding.
- Add **JWT/session auth** in front of `/api` for a real release (shown as the
  dashed box in the diagram).
- Rotate `OPENAI_API_KEY` and `AGORA_APP_CERTIFICATE` via env/secrets manager,
  never in client code.

---

## 5. How to run (local)

### 5.1 Backend

```bash
cd server
cp .env.example .env      # fill AGORA_APP_ID, AGORA_APP_CERTIFICATE, OPENAI_API_KEY
npm install
npm run dev               # tsx watch, listens on :8080
```

### 5.2 Web client

```bash
cd web-client
npm install
```

Wire the client to your CALL button:

```ts
import { useTransloCall } from './src/useTransloCall';
const call = useTransloCall({ baseUrl: 'http://localhost:8080' });

async function onCall() {
  await call.start('call_' + Date.now());   // CALL button
}
// <button onClick={call.toggleMute}>Mute</button>
// <button onClick={call.end}>End</button>
// render call.transcript as bubbles
```

> The frontend correctly ignores the `isFinal` flag timing so partial text
> updates in place and only completed sentences become bubbles — no flicker.

---

## 6. Modes explained

| Mode | Who hosts the OpenAI bridge | Latency | Setup cost | Best for |
| --- | --- | --- | --- | --- |
| `backend-bridge` (default) | You (Node) | Lowest, full control | Free | Hackathon / self-host |
| `agora-conversation-engine` | Agora cloud agent | Low | Paid Agora plan + PAT | Teams using Agora's managed agent |

The code ships both. Switch with the `mode` field in the API request.
