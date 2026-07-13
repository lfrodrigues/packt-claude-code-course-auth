import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { createApp } from '../src/app.js';
import { db, schema } from '../src/db/index.js';

const app = createApp();

const PASSWORD = 'correct-horse-battery';
const user = { email: 'ada@example.com', password: PASSWORD, name: 'Ada Lovelace' };

/** Sign up, and hand back the session cookie for reuse. */
async function signUp(overrides: Partial<typeof user> = {}) {
  const res = await request(app)
    .post('/api/auth/sign-up/email')
    .send({ ...user, ...overrides });
  return { res, cookie: res.headers['set-cookie'] as unknown as string[] };
}

describe('sign-up', () => {
  it('creates the user and issues a session cookie', async () => {
    const { res, cookie } = await signUp();

    expect(res.status).toBe(200);
    expect(cookie).toBeDefined();

    const rows = await db.select().from(schema.user).where(eq(schema.user.email, user.email));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Ada Lovelace');
  });

  it('stores the password HASHED, never as plaintext', async () => {
    await signUp();

    const [row] = await db.select().from(schema.user).where(eq(schema.user.email, user.email));
    const accounts = await db
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, row!.id));

    const stored = accounts[0]?.password;

    // This is the assertion that earns the whole "talk to a real database"
    // decision. No mock can tell you this, and NOTHING else in the suite would
    // catch a regression that started storing plaintext — every other test would
    // still be perfectly green.
    expect(stored).toBeTruthy();
    expect(stored).not.toBe(PASSWORD);
    expect(stored).not.toContain(PASSWORD);
    expect(stored!.length).toBeGreaterThan(PASSWORD.length);
  });

  it('sets the session cookie HttpOnly and SameSite=Lax', async () => {
    const { cookie } = await signUp();
    const session = cookie.find((c) => c.includes('session_token'));

    // A security property that silently degrades the first time someone "fixes"
    // a cookie problem by loosening these. Cheap to assert; expensive to lose.
    expect(session).toBeDefined();
    expect(session!.toLowerCase()).toContain('httponly');
    expect(session!.toLowerCase()).toContain('samesite=lax');
  });

  it('rejects a password shorter than the 12-char minimum, and creates no user', async () => {
    const { res } = await signUp({ email: 'weak@example.com', password: 'short' });

    expect(res.status).toBeGreaterThanOrEqual(400);

    const rows = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, 'weak@example.com'));
    expect(rows).toHaveLength(0);
  });

  it('rejects a duplicate email', async () => {
    await signUp();
    const { res } = await signUp();

    expect(res.status).toBeGreaterThanOrEqual(400);

    const rows = await db.select().from(schema.user).where(eq(schema.user.email, user.email));
    expect(rows).toHaveLength(1);
  });
});

describe('sign-in', () => {
  it('accepts the correct password and issues a cookie', async () => {
    await signUp();

    const res = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects a wrong password AND issues no session cookie', async () => {
    await signUp();

    const res = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: user.email, password: 'wrong-password-entirely' });

    expect(res.status).toBeGreaterThanOrEqual(400);

    // The status code alone isn't enough: a broken implementation could 401 and
    // still hand out a valid cookie. Assert the cookie is absent too.
    const cookies = (res.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
    expect(cookies.some((c) => c.includes('session_token'))).toBe(false);
  });
});

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

describe('sign-out', () => {
  it('invalidates the session, so the same cookie stops working', async () => {
    const { cookie } = await signUp();

    await request(app).get('/api/me').set('Cookie', cookie).expect(200);
    await request(app).post('/api/auth/sign-out').set('Cookie', cookie).expect(200);

    // Re-presenting the OLD cookie must now fail. If sign-out only cleared the
    // cookie browser-side, a stolen cookie would still work forever.
    const after = await request(app).get('/api/me').set('Cookie', cookie);
    expect(after.status).toBe(401);
  });
});

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
});

describe('GET /healthz', () => {
  it('reports the database is up', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'up' });
  });
});
