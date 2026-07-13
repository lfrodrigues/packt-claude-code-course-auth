import pino from 'pino';
import { env } from './env.js';

/**
 * "Never log secrets" is a rule in AGENTS.md. A rule the model has to remember is
 * weaker than a logger that physically cannot emit the value — so redaction is
 * configured here, once, and every log call inherits it.
 */
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.secret',
      'password',
      'token',
    ],
    censor: '[redacted]',
  },
  // Spread, not `transport: undefined` — exactOptionalPropertyTypes distinguishes
  // "absent" from "explicitly undefined", and pino wants absent.
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss' },
        },
      }
    : {}),
});
