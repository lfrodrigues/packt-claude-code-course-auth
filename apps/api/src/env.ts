import { config } from 'dotenv';
import { z } from 'zod';

config({ path: new URL('../../../.env', import.meta.url).pathname });

/**
 * Env is parsed once, at boot, and throws if anything is missing or malformed.
 *
 * The alternative — reading process.env.FOO at the call site — fails at 2am with
 * `undefined is not a string` somewhere three layers down. This fails on startup
 * with the name of the variable you forgot.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3005),

  // 32 chars is Better Auth's floor. Enforce it here so a too-short secret is a
  // boot failure with a clear message, not a confusing runtime crypto error.
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url(),

  DATABASE_URL: z.string().url(),
  TEST_DATABASE_URL: z.string().url().optional(),

  WEB_ORIGIN: z.string().url(),

  // Optional: when unset (dev without a DSN, and every test) Sentry.init is
  // skipped and the SDK is a no-op. Set it in .env to send errors to Sentry.
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  throw new Error(`Invalid environment. Check your .env against .env.example:\n${issues}`);
}

const base = parsed.data;

/** In tests, talk to the test database — never the one you were just clicking around in. */
const databaseUrl =
  base.NODE_ENV === 'test' ? (base.TEST_DATABASE_URL ?? base.DATABASE_URL) : base.DATABASE_URL;

export const env = { ...base, DATABASE_URL: databaseUrl } as const;

export type Env = typeof env;
