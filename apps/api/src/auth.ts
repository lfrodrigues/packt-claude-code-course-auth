import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import type { z } from 'zod';
import {
  MIN_PASSWORD_LENGTH,
  signInSchema,
  signUpSchema,
  type SignInInput,
  type SignUpInput,
} from '@auth-app/shared';
import { db, schema } from './db/index.js';
import { env } from './env.js';

// Better Auth endpoints whose bodies are validated against the shared contract.
// One entry per endpoint: the hook below looks the schema up by path.
// Typed to the real union, not z.ZodTypeAny: in zod 4 that infers output as
// `unknown`, so spreading `parsed.data` below no longer typechecks.
const bodySchemas: Record<string, z.ZodType<SignInInput | SignUpInput>> = {
  '/sign-up/email': signUpSchema,
  '/sign-in/email': signInSchema,
};

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
      // Sign-up gets the same budget: an unthrottled sign-up endpoint invites
      // account-creation spam and email enumeration just as much as an
      // unthrottled sign-in invites brute force.
      '/sign-up/email': { window: 60, max: 5 },
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

  hooks: {
    // The shared zod schemas are the contract, so the server must actually run
    // them — Better Auth's own checks cover password length (via
    // minPasswordLength above) but not the schemas' email normalization or the
    // name rules. Parsing here also replaces the body with the parsed output,
    // so "  Ada@Example.com " is stored as "ada@example.com" no matter what the
    // client sends. To validate another Better Auth endpoint, add its path to
    // the map — hand-written Express routes validate in their own handlers.
    before: createAuthMiddleware(async (ctx) => {
      const schema = bodySchemas[ctx.path];
      if (!schema) return;
      const parsed = schema.safeParse(ctx.body);
      if (!parsed.success) {
        throw new APIError('BAD_REQUEST', {
          message: parsed.error.issues[0]?.message ?? 'Invalid request.',
        });
      }
      return { context: { body: { ...ctx.body, ...parsed.data } } };
    }),
  },

  advanced: {
    // Secure cookies over HTTPS in production; plain http in local dev.
    useSecureCookies: env.NODE_ENV === 'production',

    ipAddress: {
      // Replaces the default `x-forwarded-for`, which arrives with 5 values in
      // prod (Cloudflare edge + the static site's /api/* rewrite). Better Auth
      // only trusts a single-valued header, so it returns null and collapses
      // every client into one shared rate-limit bucket. `cf-connecting-ip` is
      // set by the edge, single-valued, and can't be forged (403 at the edge).
      // Absent without Cloudflare (dev/tests) → null → shared bucket, i.e.
      // throttles too much, never too little. Measured: see docs/plans/012.
      ipAddressHeaders: ['cf-connecting-ip'],
    },
  },

  // Only these origins may drive the auth endpoints.
  trustedOrigins: [env.WEB_ORIGIN],
});
