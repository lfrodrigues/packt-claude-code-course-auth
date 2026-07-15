import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

/**
 * The crash endpoint exists to prove Sentry captures unhandled errors. This test
 * pins the OTHER half of that contract: no matter what the route throws, the
 * client still gets the generic 500 with NO stack trace. If a future change let
 * the error handler leak `err.stack` or the real message, this fails.
 */
describe('GET /api/crash', () => {
  it('returns a generic 500 and never leaks the error details', async () => {
    const res = await request(app).get('/api/crash');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('Invalid array length');
    expect(serialized).not.toMatch(/\bat .+:\d+:\d+/); // no stack frames
  });
});
