import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { TokenService } from '../services/TokenService';
import { AgentService } from '../services/AgentService';
import { logger } from '../logger';

export function createRoutes(
  tokens: TokenService,
  agent: AgentService,
): Router {
  const router = Router();

  // -------------------------------------------------------------------------
  // POST /api/start-ai-agent
  //
  // Fired when the user presses CALL on the dialpad. Generates the channel,
  // assigns UIDs, launches/invites the Conversational AI Agent, and returns
  // every credential the client needs to attach the WebRTC audio + transcript
  // stream.
  // -------------------------------------------------------------------------
  const startSchema = z.object({
    channelName: z.string().min(1).max(64),
    mode: z.enum(['backend-bridge', 'agora-conversation-engine']).optional(),
  });

  router.post('/start-ai-agent', async (req, res) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_BODY', details: parsed.error.flatten() });
    }
    const { channelName, mode = 'backend-bridge' } = parsed.data;

    const clientUid = TokenService.randomUid();
    const agentUid = (clientUid + 1) % 2_000_000_000; // distinct from client

    try {
      const started = await agent.startAgent({
        channelName,
        agentUid,
        mode,
      });
      const credentials = agent.buildCredentials(channelName, agentUid, clientUid);
      logger.info('[api] start-ai-agent', { channel: channelName, mode });

      return res.json({
        ok: true,
        status: started.status,
        agent: { uid: agentUid, mode },
        credentials,
      });
    } catch (err) {
      logger.error('[api] start-ai-agent failed', err);
      return res.status(502).json({ ok: false, error: 'AGENT_START_FAILED' });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/credentials?channelName=xxx
  //
  // Convenience for the client to (re)fetch credentials for an existing
  // channel (e.g. on reconnect or re-entry) without re-launching the agent.
  // -------------------------------------------------------------------------
  router.get('/credentials', (req, res) => {
    const channelName = String(req.query.channelName ?? '').trim();
    if (!channelName) {
      return res.status(400).json({ error: 'channelName required' });
    }
    const clientUid = TokenService.randomUid();
    const agentUid = (clientUid + 1) % 2_000_000_000;
    const credentials = agent.buildCredentials(channelName, agentUid, clientUid);
    return res.json({ ok: true, credentials });
  });

  // -------------------------------------------------------------------------
  // POST /api/rtm-token
  //
  // Issue a fresh RTM token for the transcript subtitle channel (tokens
  // expire; the client refreshes silently).
  // -------------------------------------------------------------------------
  router.post('/rtm-token', (req, res) => {
    const parsed = z
      .object({ channelName: z.string().min(1), uid: z.number().int().optional() })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_BODY' });
    }
    const uid = (parsed.data.uid as number | undefined) ?? TokenService.randomUid();
    const t = tokens.buildChannelTokens(parsed.data.channelName, uid);
    return res.json({ ok: true, rtmToken: t.rtmToken, uid, appId: config.agora.appId });
  });

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      ts: Date.now(),
      pipelineSet: Boolean(config.agora.agentPipelineId),
      appIdSet: Boolean(config.agora.appId),
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/agent-session/start
  //
  // Starts the user's Agent Studio pipeline into an EXISTING live channel
  // (created by the mobile widget on dial). Returns the agent instance uid
  // the client needs for transcript/phrase wiring. No Console action needed.
  // -------------------------------------------------------------------------
  router.post('/agent-session/start', async (req, res) => {
    const parsed = z
      .object({
        channelName: z.string().min(1).max(128),
        languageCode: z.string().min(2).max(8).optional(),
        languageLabel: z.string().min(1).max(32).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_BODY' });
    }
    try {
      const started = await agent.startStudioAgent(
        parsed.data.channelName,
        parsed.data.languageCode,
        parsed.data.languageLabel,
      );
      return res.json({ ok: true, ...started });
    } catch (err) {
      logger.error('[api] agent-session/start failed', err);
      return res.status(502).json({
        ok: false,
        error: 'AGENT_START_FAILED',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/agent-session/leave
  //
  // Best-effort stop for a Studio agent (call end). Missing/already-gone
  // agents return ok:true so the mobile client never shows a scary error on
  // hang-up. Agora also auto-removes idle agents after 120s.
  // -------------------------------------------------------------------------
  router.post('/agent-session/leave', async (req, res) => {
    const parsed = z
      .object({
        agentId: z.union([z.string().min(1).max(128), z.number()]),
        channelName: z.string().min(1).max(128).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_BODY' });
    }
    try {
      await agent.stopStudioAgent(parsed.data.agentId, parsed.data.channelName);
      return res.json({ ok: true });
    } catch (err) {
      logger.error('[api] agent-session/leave failed', err);
      // Still 200 with ok:false — hang-up must never fail loudly.
      return res.json({
        ok: false,
        error: 'AGENT_LEAVE_FAILED',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return router;
}
