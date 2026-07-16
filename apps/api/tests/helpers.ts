import request from 'supertest';
import { createApp } from '../src/app.js';

/** One app instance shared by every test file — createApp() binds no port. */
export const app = createApp();

export const PASSWORD = 'correct-horse-battery';
export const user = { email: 'ada@example.com', password: PASSWORD, name: 'Ada Lovelace' };

/** Sign up, and hand back the session cookie for reuse. */
export async function signUp(overrides: Partial<typeof user> = {}) {
  const res = await request(app)
    .post('/api/auth/sign-up/email')
    .send({ ...user, ...overrides });
  return { res, cookie: res.headers['set-cookie'] as unknown as string[] };
}
