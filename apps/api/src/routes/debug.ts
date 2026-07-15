import { Router } from 'express';

/** Mounted only outside production (see `app.ts`) — never a public crash endpoint. */
export const debugRouter: Router = Router();

// Deliberately triggers a real bug (dividing by an empty array's length, then
// using the resulting NaN as an array length) so we can verify Sentry actually
// captures unhandled errors end-to-end.
debugRouter.get('/', (req) => {
  const amounts: number[] = [];
  const total = amounts.reduce((sum, n) => sum + n, 0);
  const average = total / amounts.length;

  const bucket = new Array(average).fill(req.query.label ?? 'unlabeled');
  return bucket;
});
