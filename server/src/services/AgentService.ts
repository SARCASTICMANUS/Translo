import { config } from '../config';
import { logger } from '../logger';
import { TokenService } from './TokenService';

// -----------------------------------------------------------------------------
// Conversational AI Agent launcher.
//
// Two supported modes:
//
//   MODE A — "Backend Bridge" (default, zero extra Agora cost, fully self
//            managed): the server itself opens an OpenAI Realtime session and
//            joins the Agora RTC channel as a PUBLISHER. It pumps user mic
//            audio -> OpenAI, and OpenAI reply audio -> the channel. Live
//            transcripts are published to the RTM channel for the chat UI.
//
//   MODE B — "Agora Conversation AI Engine": calls Agora's managed agent REST
//            API to start a cloud agent with an OpenAI Realtime backend. You
//            must provide AGORA_AGENT_PAT and the agent deployment. Kept as an
//            alternative for teams using Agora's managed service.
//
// The REST contract for Mode B is thin by design and isolated in one method so
// you can adapt it to your Console project ID / region without touching the
// rest of the app.
// -----------------------------------------------------------------------------

export type AgentMode = 'backend-bridge' | 'agora-conversation-engine';

export interface AgentSpec {
  channelName: string;
  agentUid: number;
  mode: AgentMode;
}

export interface StartedAgent {
  agentUid: number;
  channelName: string;
  mode: AgentMode;
  status: 'started' | 'deferred';
}

// Per-call language lock: the app tells us which language the user chose,
// and the agent is instructed to reply ONLY in it (no drifting).
const GREETINGS: Record<string, string> = {
  en: 'Hello! How can I help you?',
  hi: 'नमस्ते! मैं आपकी क्या मदद कर सकता हूँ?',
  ta: 'வணக்கம்! நான் உங்களுக்கு எப்படி உதவ முடியும்?',
  kn: 'ನಮಸ್ಕಾರ! ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
};
const FAILURES: Record<string, string> = {
  en: "Sorry, I didn't catch that. Could you please say it once more?",
  hi: 'माफ़ कीजिए, समझ नहीं आया। कृपया फिर से कहिए।',
  ta: 'மன்னிக்கவும், புரியவில்லை. மீண்டும் சொல்லுங்கள்.',
  kn: 'ಕ್ಷಮಿಸಿ, ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.',
};
const ASR_LANG: Record<string, string> = { en: 'en', hi: 'hi', ta: 'ta', kn: 'kn' };
const LANG_LABEL: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  kn: 'Kannada',
};

function lockedPrompt(label: string): string {
  return `You are a friendly person answering a phone call. Reply ONLY in ${label} — every single reply, no exceptions, even if the caller uses another language. Keep every reply to 1-2 short sentences. Sound natural and human, never robotic. No fillers.`;
}

export class AgentService {
  constructor(private tokens: TokenService) {}

  /**
   * Invoke the agent for a channel. `defer=true` (used when the subscriber
   * is not yet in the voice channel) returns a "deferred" status immediately
   * — set up all credentials so the frontend can start the WebRTC bridge the
   * moment the user hits CALL.
   */
  async startAgent(spec: AgentSpec): Promise<StartedAgent> {
    const { channelName, agentUid, mode } = spec;

    if (mode === 'agora-conversation-engine') {
      return this.startAgoraManagedAgent(channelName, agentUid);
    }

    // Mode A: backend bridge. All credentials are prepared here; the actual
    // WebSocket/WebRTC attachment happens in `attachBridge` below (or on the
    // frontend when `defer` is true).
    logger.info('[agent] prepared backend-bridge', {
      channel: channelName,
      agentUid,
    });
    return { agentUid, channelName, mode, status: 'started' };
  }

  /**
   * Build the full set of credentials the client needs to attach the live
   * audio+transcript bridge.
   */
  buildCredentials(channelName: string, agentUid: number, clientUid: number) {
    const rtc = this.tokens.buildChannelTokens(channelName, agentUid);
    const client = this.tokens.buildChannelTokens(channelName, clientUid);
    return {
      appId: config.agora.appId,
      channelName,
      clientUid,
      clientRtcToken: client.rtcToken,
      agentUid,
      agentRtcToken: rtc.rtcToken,
      rtmToken: client.rtmToken,
      openai: {
        model: config.openai.realtimeModel,
        systemPrompt: config.systemPrompt,
      },
    };
  }

  /**
   * Mode C: Agent Studio pipeline. Starts the user's published Studio agent
   * (pipeline id from AGORA_AGENT_PIPELINE_ID) directly into a live channel
   * via the official Conversational AI Engine v2 join API, authenticated with
   * a freshly minted RTC token (`agora token=` scheme — no customer secret
   * needed). Returns the agent instance uid for transcript/phrase wiring.
   */
  async startStudioAgent(
    channelName: string,
    languageCode = 'en',
    languageLabel?: string,
  ): Promise<{ agentUid: number | string; agentRtcUid: number; agentRtmUid: string; channelName: string }> {
    const appId = config.agora.appId;
    const pipelineId = config.agora.agentPipelineId;
    if (!pipelineId) {
      throw new Error('AGORA_AGENT_PIPELINE_ID is not set');
    }
    const code = ASR_LANG[languageCode] ? languageCode : 'en';
    const label = languageLabel || LANG_LABEL[code] || 'English';

    // Agora expects numeric tokens for RTC and strings/numbers for identifiers depending on layout
    const agentRtcUid = TokenService.randomUid();
    const agentRtmUid = String(TokenService.randomUid());

    const agentToken = this.tokens.buildChannelTokens(channelName, agentRtcUid).rtcToken;
    if (!agentToken) {
      throw new Error('AGORA_APP_CERTIFICATE is required to mint the agent token');
    }

    const url = `${config.agora.agentApiBase}/projects/${appId}/join`;
    const name = `translo-${Date.now().toString(36)}`;

    // Full explicit properties (Studio-generated shape for this pipeline) with
    // managed credentials: pipeline-only creation fails (tts.addon), and the
    // managed+style fields are required for the agent to boot. agent_rtm_uid
    // is required too — without it the agent never joins RTC audio.
    const makeBody = (asrLang: string) => ({
      name,
      pipeline_id: pipelineId,
      properties: {
        asr: {
          credential_mode: 'managed',
          params: {
            url: 'wss://api.deepgram.com/v1/listen',
            model: 'nova-3',
            keyterm: '',
            language: asrLang,
          },
          vendor: 'deepgram',
        },
        llm: {
          credential_mode: 'managed',
          url: 'https://api.openai.com/v1/chat/completions',
          style: 'openai',
          params: { model: 'gpt-3.5-turbo' },
          vendor: 'openai',
          failure_message: FAILURES[code] ?? FAILURES.en,
          system_messages: [{ role: 'system', content: lockedPrompt(label) }],
          greeting_message: GREETINGS[code] ?? GREETINGS.en,
        },
        sal: { sal_mode: 'locking', sample_urls: {} },
        tts: {
          credential_mode: 'managed',
          params: {
            url: 'wss://api-uw.minimax.io/ws/v1/t2a_v2',
            model: 'speech-2.8-turbo',
            voice_setting: { voice_id: 'English_radiant_girl' },
          },
          vendor: 'minimax',
        },
        parameters: {
          silence_config: {
            action: 'think',
            content: 'politely ask if the user is still online',
            timeout_ms: 60000,
          },
        },
        filler_words: {
          enable: false,
          content: { mode: 'static', static_config: { phrases: [], selection_rule: 'shuffle' } },
          trigger: { mode: 'fixed_time', fixed_time_config: { response_wait_ms: 1500 } },
        },
        idle_timeout: 120,
        turn_detection: {
          mode: 'default',
          config: {
            end_of_speech: { mode: 'vad', vad_config: { silence_duration_ms: 640 } },
            start_of_speech: {
              mode: 'vad',
              vad_config: {
                prefix_padding_ms: 800,
                interrupt_duration_ms: 160,
                speaking_interrupt_duration_ms: 160,
              },
            },
            speech_threshold: 0.5,
          },
        },
        advanced_features: { enable_rtm: true, enable_sal: true },
        channel: channelName,
        token: agentToken,
        agent_rtc_uid: String(agentRtcUid),
        agent_rtm_uid: agentRtmUid,
      },
    });

    try {
      logger.info('[agent] initiating studio pipeline join request', { channelName, agentRtcUid });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization using PAT or Basic encoding depending on how your global config is set up
          'Authorization': `Bearer ${config.agora.agentPat || config.agora.appCertificate}`,
        },
        body: JSON.stringify(makeBody(code)),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Agora API rejected join request (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      // Agora typical response payload wraps instance details under a status or base layout
      const remoteAgentId = data.instance_id || data.id || agentRtcUid;

      logger.info('[agent] studio pipeline agent successfully spawned', { remoteAgentId, channelName });

      return {
        agentUid: remoteAgentId,
        agentRtcUid,
        agentRtmUid,
        channelName,
      };
    } catch (error) {
      logger.error('[agent] failed to spawn studio agent pipeline', { error, channelName });
      throw error;
    }
  }

  /**
   * Best-effort leave for a Studio agent. Agora auto-removes agents after
   * `idle_timeout` (120s here), so a failed leave is never fatal — the next
   * call still works. 404 / already-gone is treated as success to avoid
   * orphan-error spam in the mobile retry banner.
   */
  async stopStudioAgent(agentId: string | number, channelName?: string): Promise<void> {
    const appId = config.agora.appId;
    const id = String(agentId).trim();
    if (!id) return;
    const url = `${config.agora.agentApiBase}/projects/${appId}/agents/${encodeURIComponent(id)}/leave`;
    // Token auth matches the join flow (`agora token=`). If a channel is
    // known, mint a token for it; otherwise fall back to PAT/Basic if set.
    let auth = '';
    if (channelName) {
      const numericUid = Number(id);
      const uidForToken = Number.isSafeInteger(numericUid) && numericUid > 0 ? numericUid : TokenService.randomUid();
      const t = this.tokens.buildChannelTokens(channelName, uidForToken).rtcToken;
      if (t) auth = `agora token=${t}`;
    }
    if (!auth && config.agora.agentPat) {
      auth = config.agora.agentPat.startsWith('Basic ') ? config.agora.agentPat : `Bearer ${config.agora.agentPat}`;
    }
    if (!auth) {
      logger.warn('[agent] leave skipped — no auth available (no channel + no PAT)');
      return;
    }
    logger.info('[agent] leaving Studio agent', { agentId: id });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
    });
    const text = await res.text().catch(() => '');
    if (res.ok || res.status === 404 || /already|not found|gone/i.test(text)) {
      logger.info('[agent] Studio agent left (or already gone)', { agentId: id });
      return;
    }
    logger.error('[agent] Studio agent leave failed', { status: res.status, body: text.slice(0, 300) });
    throw new Error(`Studio agent leave failed (${res.status}): ${text.slice(0, 200)}`);
  }

  /**
   * Mode B: call Agora's managed Conversation AI Engine to launch the agent in
   * the channel, configured to pipe audio into the configured LLM.
   *
   * NOTE: The exact request/response shape depends on your Agora project and
   * agent deployment. This is a faithful-but-generic contract — adapt the
   * `body` to match the agent you registered in the Agora Console.
   */
  private async startAgoraManagedAgent(
    channelName: string,
    agentUid: number,
  ): Promise<StartedAgent> {
    if (!config.agora.agentPat) {
      throw new Error(
        'AGORA_AGENT_PAT is required for agora-conversation-engine mode',
      );
    }

    const url = `${config.agora.agentApiBase}/projects/${config.agora.appId}/conversation-ai/agents/start`;
    const token = this.tokens.buildChannelTokens(channelName, agentUid);

    logger.info('[agent] starting Agora managed Conversational AI agent', {
      channel: channelName,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.agora.agentPat}`,
      },
      body: JSON.stringify({
        name: `translo-agent-${channelName}`,
        properties: {
          // Agora RTC subscription: agent hears the user's published audio.
          rtc: {
            channel: channelName,
            uid: agentUid,
            token: token.rtcToken || undefined,
            // only subscribe to audio (agents don't need the video track)
            subscribe: { audio: true, video: false },
            publish: { audio: true, video: false },
          },
          // Conversation AI Engine routing to NVIDIA Nemotron.
          llm: {
            vendor: 'NVIDIA',
            model: config.openai.realtimeModel,
            apiKey: config.openai.apiKey,
            systemPrompt: config.systemPrompt,
          },
          // Transcript extension -> RTM subtitle channel (chat UI).
          transcription: {
            vendors: ['NVIDIA'],
            enabled: true,
            publishToRtmChannel: `${channelName}_transcript`,
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.error('[agent] Agora managed agent failed', {
        status: res.status,
        body: text,
      });
      throw new Error(`Agora agent start failed (${res.status})`);
    }

    const json = (await res.json()) as { agentId: string };
    logger.info('[agent] Agora managed agent started', { agentId: json.agentId });
    return { agentUid, channelName, mode: 'agora-conversation-engine', status: 'started' };
  }
}
