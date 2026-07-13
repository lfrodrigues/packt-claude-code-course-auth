import { Router } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db/index.js';

export const healthRouter: Router = Router();

/** Liveness + a real database round-trip. Ops probe, not a domain API. */
healthRouter.get('/', async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: 'ok', db: 'up' });
  } catch {
    res.status(503).json({ status: 'degraded', db: 'down' });
  }
});
