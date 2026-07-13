import { Router } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import type { MeResponse } from '@auth-app/shared';
import { auth } from '../auth.js';

export const meRouter: Router = Router();

/**
 * GET /api/me — the only hand-written endpoint in this repo.
 *
 * It exists to show the one thing you'll copy into every protected route you
 * ever write: ask Better Auth for the session, and 401 if there isn't one.
 *
 * Note it returns 401 for BOTH "no cookie" and "cookie present but invalid".
 * getSession() validates the signature — a forged or tampered cookie yields null,
 * exactly like no cookie at all. A route that only checks `cookie !== undefined`
 * would pass a happy-path test and be trivially bypassable.
 */
meRouter.get('/', async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body: MeResponse = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };

  res.json(body);
});
