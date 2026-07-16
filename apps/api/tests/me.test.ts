import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, user, signUp } from './helpers.js';

describe('GET /api/me', () => {
  it('401s with no cookie', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(401);
  });

  it('200s with a valid cookie and returns the right user', async () => {
    const { cookie } = await signUp();

    const res = await request(app).get('/api/me').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: user.email, name: user.name });
  });

  it('401s on a TAMPERED cookie', async () => {
    const { cookie } = await signUp();
    const tampered = cookie.map((c) => c.replace(/session_token=[^;]+/, 'session_token=forged'));

    const res = await request(app).get('/api/me').set('Cookie', tampered);

    // The one that catches a route checking `cookie !== undefined` instead of
    // verifying the signature. A happy-path test sails straight past that bug.
    expect(res.status).toBe(401);
  });
});
