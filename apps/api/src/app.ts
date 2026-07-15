import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import * as Sentry from '@sentry/node';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { errorHandler, notFoundHandler } from './error-handler.js';
import { meRouter } from './routes/me.js';
import { healthRouter } from './routes/health.js';
import { debugRouter } from './routes/debug.js';

/**
 * Exported as a factory so tests can build an app without binding a port.
 * `server.ts` is the only place that calls .listen().
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(pinoHttp({ logger }));

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true, // required: the session travels as a cookie
    })
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // ORDER IS LOAD-BEARING. Two ways to get this wrong, both of which "look fine":
  //
  //  1. express.json() before this line — Better Auth reads the raw body itself,
  //     so a consumed stream makes every auth request hang on "pending" forever.
  //  2. Using "/api/auth/*" (Express 4 syntax) — Express 5 requires a NAMED splat
  //     and throws a path-to-regexp error at boot.
  //
  // The auth handler is mounted FIRST, and json() comes after, for everything else.
  // ─────────────────────────────────────────────────────────────────────────────
  app.all('/api/auth/*splat', toNodeHandler(auth));

  app.use(express.json());

  app.use('/healthz', healthRouter);
  app.use('/api/me', meRouter);

  // Crash endpoint used only to prove Sentry captures unhandled errors. Never
  // mounted in production, so it can't be hit publicly.
  if (env.NODE_ENV !== 'production') {
    app.use('/api/crash', debugRouter);
  }

  // Registered AFTER the routes and BEFORE our own handlers. Sentry only captures
  // the error and calls next(err), so `errorHandler` still returns the generic
  // 500 — no stack trace leaks to the client. No-op when Sentry.init was skipped.
  Sentry.setupExpressErrorHandler(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
