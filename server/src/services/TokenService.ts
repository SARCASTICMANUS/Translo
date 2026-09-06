import { config } from '../config';
import { createRequire } from 'module';
import { randomBytes } from 'crypto';

// `agora-token` is a CommonJS module without an `exports` map, so Node's
// static ESM-CJS named-export detection cannot resolve our named imports at
// runtime. We load it defensively via createRequire (works in both ESM and CJS).
const require = createRequire(import.meta.url);
const {
  RtcTokenBuilder,
  RtcRole,
  RtmTokenBuilder,
} = require('agora-token') as typeof import('agora-token');

// -----------------------------------------------------------------------------
// Agora token issuance.
//
// Two distinct token types are needed:
//   1. RTC token  -> joins the voice channel where the user + AI agent talk.
//   2. RTM token  -> signs the signalling channel used to stream subtitles
//                    back to the chat UI in real time.
//
// In no-certificate ("testing") mode Agora lets you join with appId only; we
// still generate tokens so the code works identically once you add a cert.
// -----------------------------------------------------------------------------

export interface TokenPair {
  rtcToken: string;
  rtmToken: string;
  channelName: string;
  uid: number;
  appId: string;
}

export class TokenService {
  /**
   * Build both tokens for a given channel + uid.
   * `uid` should be a positive integer; 0 means "assign any" (we proactively
   * assign our own so the chat transcript stream can attribute speakers).
   */
  buildChannelTokens(channelName: string, uid: number): TokenPair {
    const appId = config.agora.appId;
    const cert = config.agora.appCertificate;
    const now = Math.floor(Date.now() / 1000);
    const tokenExpire = now + config.tokenExpiration;

    let rtcToken = '';
    if (cert) {
      rtcToken = RtcTokenBuilder.buildTokenWithUid(
        appId, cert, channelName, uid, RtcRole.PUBLISHER, tokenExpire, tokenExpire,
      );
    }

    let rtmToken = '';
    if (cert) {
      rtmToken = RtmTokenBuilder.buildToken(
        appId, cert, String(uid), now + config.rtmTokenExpiration,
      );
    }

    return { rtcToken, rtmToken, channelName, uid, appId };
  }

  /**
   * Generate a random client UID (positive 32-bit int). Keeps us clear of 0
   * (which Agora treats as "auto-assign").
   */
  static randomUid(): number {
    const buf = randomBytes(4);
    const n = buf.readUInt32BE(0);
    return (n % 2_000_000_000) + 1;
  }
}
