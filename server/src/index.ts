import express from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './logger';
import { TokenService } from './services/TokenService';
import { AgentService } from './services/AgentService';
import { createRoutes } from './routes';

const app = express();
// CORS: allow configured origins + no-origin (native/WebView fetches) +
// emulator loopbacks. WebView posts from http://localhost with fetch to
// http://10.0.2.2:8080 — both must be allowed or the agent join silently fails.
const allowedOrigins = new Set(config.corsOrigin);
app.use(
  cors({
    origin: (origin, cb) => {
      // No Origin header = curl / native fetch / WebView inject — allow in dev.
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      // Always allow loopback + emulator + LAN in dev so physical devices work.
      try {
        const u = new URL(origin);
        const host = u.hostname;
        if (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host === '10.0.2.2' ||
          host === '10.0.3.2' ||
          host.startsWith('192.168.') ||
          host.startsWith('10.')
        ) {
          return cb(null, true);
        }
      } catch {
        // fall through to block
      }
      return cb(new Error(`CORS blocked: ${origin}`));
    },
  }),
);
app.use(express.json({ limit: '1mb' }));

// Simple request logger
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

const tokens = new TokenService();
const agentService = new AgentService(tokens);
app.use('/api', createRoutes(tokens, agentService));

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('[server] unhandled error', err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  },
);

app.listen(config.port, '0.0.0.0', () => {
  logger.info(`Translo voice-agent backend listening on :${config.port}`);
  if (!config.agora.appId) {
    logger.warn('AGORA_APP_ID not set — set it in .env before going live.');
  }
  if (!config.agora.appCertificate) {
    logger.warn('AGORA_APP_CERTIFICATE not set — using no-token (testing) mode.');
  }
  if (!config.agora.agentPipelineId) {
    logger.warn('AGORA_AGENT_PIPELINE_ID not set — /api/agent-session/start will 502.');
  }
  if (!config.openai.apiKey) {
    logger.warn('OPENAI_API_KEY not set — only Studio managed-credential mode will work.');
  }
});
