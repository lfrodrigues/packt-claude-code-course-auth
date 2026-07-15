import './instrument.js'; // MUST be first — installs Sentry before Express loads
import { createApp } from './app.js';
import { env } from './env.js';
import { logger } from './logger.js';
import { pool } from './db/index.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
});

/**
 * Graceful shutdown: stop accepting new connections, let in-flight requests
 * finish, then close the pool. Without this, a deploy kills requests mid-write.
 */
const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down');

  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });

  // Don't hang forever on a stuck connection.
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
