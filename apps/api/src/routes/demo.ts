import { Router } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { demoFormSchema, type DemoResponse } from '@auth-app/shared';
import { auth } from '../auth.js';

export const demoRouter: Router = Router();

/**
 * POST /api/demo — the worked example of validating a hand-written route with
 * the shared contract. Better Auth endpoints get this via the hook in auth.ts;
 * your own routes do it right here in the handler.
 *
 * The client validates with the SAME schema before sending, but anything can
 * POST to this URL directly — the parse below is the one that counts.
 */
demoRouter.post('/', async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = demoFormSchema.safeParse(req.body);

  if (!parsed.success) {
    // zod messages are written to be user-facing (see shared-contract rules),
    // so the first issue is safe to return as-is.
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' });
    return;
  }

  // Echo back what the server understood: the trimmed, lowercased email and a
  // real number — proof the coercion happened server-side too.
  const body: DemoResponse = parsed.data;
  res.json(body);
});
