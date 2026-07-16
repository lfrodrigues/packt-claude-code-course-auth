import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/index.js';
import { app, user, PASSWORD, signUp } from './helpers.js';

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

  it('rejects an invalid email server-side (shared schema, not just the browser form)', async () => {
    const { res } = await signUp({ email: 'not-an-email' });

    // The browser form validates with the shared schema too, but anything can
    // POST to the API directly — this asserts the SERVER runs the contract.
    expect(res.status).toBe(400);

    const rows = await db.select().from(schema.user);
    expect(rows).toHaveLength(0);
  });

  it('rejects an empty name server-side, and creates no user', async () => {
    const { res } = await signUp({ email: 'noname@example.com', name: '   ' });

    expect(res.status).toBe(400);

    const rows = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, 'noname@example.com'));
    expect(rows).toHaveLength(0);
  });

  it('normalizes the email: "  Ada@Example.COM " is stored as ada@example.com', async () => {
    const { res } = await signUp({ email: '  Ada@Example.COM ' });

    expect(res.status).toBe(200);

    // The shared schema trims and lowercases; the before-hook replaces the body
    // with the parsed output, so the normalized form is what reaches the DB.
    const rows = await db.select().from(schema.user).where(eq(schema.user.email, user.email));
    expect(rows).toHaveLength(1);
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
