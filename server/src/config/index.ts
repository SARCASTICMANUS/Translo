import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Fail loud in production, lenient in dev so the server can boot for
    // local testing without credentials.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required env var: ${name}`);
    }
    console.warn(`[config] ${name} is not set — running with placeholder.`);
    return value ?? '';
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:8081')
    .split(',')
    .map((s) => s.trim()),

  agora: {
    appId: required('AGORA_APP_ID'),
    appCertificate: required('AGORA_APP_CERTIFICATE'),
    // Official Conversational AI Engine REST base (v2 join/leave).
    agentApiBase:
      process.env.AGORA_CONVOAI_API_BASE ??
      'https://api.agora.io/api/conversational-ai-agent/v2',
    // Only needed for Mode B (agora-conversation-engine). Mode C (Studio
    // pipeline via /api/agent-session/start) uses `agora token=` auth and
    // managed credentials, so this stays optional.
    agentPat: process.env.AGORA_AGENT_PAT ?? '',
    // Agent Studio pipeline id started into each live call channel.
    agentPipelineId: required('AGORA_AGENT_PIPELINE_ID'),
  },

  openai: {
    // Only needed for Mode A/B. Mode C uses managed credentials.
    apiKey: process.env.OPENAI_API_KEY ?? '',
    realtimeModel: process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview',
  },

  systemPrompt: (process.env.AGENT_SYSTEM_PROMPT ?? '').replace(/%%NEWLINE%%/g, '\n'),

  // How long a channel is valid for (seconds). RTM tokens expire faster.
  tokenExpiration: 3600 * 24,
  rtmTokenExpiration: 3600,
} as const;