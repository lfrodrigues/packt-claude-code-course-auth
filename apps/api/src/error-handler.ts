import type { ErrorRequestHandler, RequestHandler } from 'express';
import { logger } from './logger.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Not found' });
};

/**
 * The real error is logged server-side; the client gets a generic message.
 *
 * Leaking a stack trace tells an attacker your file layout, your dependencies and
 * often your query shapes. There is no version of this app where the browser
 * needs that.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
};
