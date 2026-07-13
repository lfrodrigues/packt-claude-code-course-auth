import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { MIN_PASSWORD_LENGTH } from '@auth-app/shared';
import { db, schema } from './db/index.js';
import { env } from './env.js';

/**
 * The security boundary. Everything here is a decision with a blast radius.
 *
 * Password hashing is scrypt (Better Auth's default). We do not override it —
 * rolling your own is how you end up storing something that only looks hashed.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,

  emailAndPassword: {
    enabled: true,
    // Shared with the client's zod schema so the browser and the server cannot
    // disagree about what counts as a valid password.
    minPasswordLength: MIN_PASSWORD_LENGTH,
  },

  // Better Auth DISABLES rate limiting in development by default. Leaving that
  // default in place ships an auth endpoint with no brute-force protection —
  // which is exactly the kind of "looks fine, tests pass" gap this repo is about.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
    },
    // Counters live in Postgres, not in process memory. Two reasons, and the
    // second is the one people miss:
    //   1. In-memory counters reset on deploy and aren't shared across instances,
    //      so a limit of 5 becomes 5-per-instance-until-the-next-restart.
    //   2. It makes the limiter TESTABLE: tests truncate the table between cases,
    //      so one test can prove the 429 without every other test tripping it.
    storage: 'database',
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    // cookieCache is deliberately OFF. It skips the database lookup by trusting
    // the signed cookie for its maxAge — which means a signed-out (revoked)
    // session KEEPS WORKING until the cache expires. The sign-out test caught
    // exactly that. For an auth service, immediate revocation is worth one DB
    // read per request; only enable this if you accept delayed revocation.
    cookieCache: { enabled: false },
  },

  advanced: {
    // Secure cookies over HTTPS in production; plain http in local dev.
    useSecureCookies: env.NODE_ENV === 'production',
  },

  // Only these origins may drive the auth endpoints.
  trustedOrigins: [env.WEB_ORIGIN],
});

export type Auth = typeof auth;
