import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../env.js';
import { logger } from '../logger.js';
import * as schema from './schema.js';

export const pool = new Pool({ connectionString: env.DATABASE_URL });

// An error on an idle client is emitted on the pool; without a listener it is an
// unhandled 'error' event and crashes the process. The client is already removed
// from the pool — log it and keep serving.
pool.on('error', (err) => {
  logger.error({ err }, 'Idle database client error');
});

export const db = drizzle(pool, { schema });

export { schema };
