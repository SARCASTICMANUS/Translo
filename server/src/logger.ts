const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const;

function ts(): string {
  return new Date().toISOString();
}

export const logger = {
  debug: (msg: string, ctx?: unknown) => log(0, msg, ctx),
  info: (msg: string, ctx?: unknown) => log(1, msg, ctx),
  warn: (msg: string, ctx?: unknown) => log(2, msg, ctx),
  error: (msg: string, ctx?: unknown) => log(3, msg, ctx),
};

function log(level: number, msg: string, ctx?: unknown) {
  // eslint-disable-next-line no-console
  console[level <= 2 ? 'log' : 'error'](
    `[${ts()}] ${LEVELS[level]} ${msg}`,
    ctx === undefined ? '' : ctx,
  );
}
