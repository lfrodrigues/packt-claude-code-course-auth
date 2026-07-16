import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, user, signUp } from './helpers.js';

describe('rate limiting', () => {
  it('429s the 6th rapid failed sign-in', async () => {
    await signUp();

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/api/auth/sign-in/email')
        .send({ email: user.email, password: 'wrong' });
      statuses.push(res.status);
    }

    // Better Auth disables rate limiting in dev by DEFAULT. This test is what
    // stops someone "simplifying" that config back to the default and shipping
    // an unthrottled login endpoint.
    expect(statuses.slice(0, 5).every((s) => s !== 429)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it('429s the 6th rapid sign-up', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const { res } = await signUp({ email: `spam-${i}@example.com` });
      statuses.push(res.status);
    }

    // Sign-up has its own 5/60 rule: an unthrottled sign-up endpoint invites
    // account-creation spam even with sign-in fully protected.
    expect(statuses.slice(0, 5).every((s) => s !== 429)).toBe(true);
    expect(statuses[5]).toBe(429);
  });
});
