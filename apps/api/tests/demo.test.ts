import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, user, signUp } from './helpers.js';

describe('POST /api/demo', () => {
  it('401s with no cookie', async () => {
    const res = await request(app).post('/api/demo').send({ email: user.email, amount: 5 });
    expect(res.status).toBe(401);
  });

  it('400s when the shared schema rejects the body', async () => {
    const { cookie } = await signUp();

    const res = await request(app)
      .post('/api/demo')
      .set('Cookie', cookie)
      .send({ email: user.email, amount: 'not-a-number' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('coerces and normalizes: string amount and messy email come back clean', async () => {
    const { cookie } = await signUp();

    const res = await request(app)
      .post('/api/demo')
      .set('Cookie', cookie)
      .send({ email: '  Ada@Example.COM ', amount: '42' });

    // The server ran the SAME schema the form did: "42" became the number 42,
    // and the email was trimmed and lowercased.
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: 'ada@example.com', amount: 42 });
  });
});
