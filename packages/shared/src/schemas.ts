import { z } from 'zod';

/**
 * The contract between the browser form and the server.
 *
 * Both apps import these. That is the entire point: a field renamed here is a
 * compile error in both places, not a 400 someone discovers in production.
 *
 * MIN_PASSWORD_LENGTH must stay in sync with `emailAndPassword.minPasswordLength`
 * in apps/api/src/auth.ts. It is exported so the API can pass it to Better Auth
 * rather than restating the number.
 */
export const MIN_PASSWORD_LENGTH = 12;

// Don't migrate to top-level z.email() — it validates before .trim()/
// .toLowerCase() run, so padded/mixed-case input fails instead of normalizing.
export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.');

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(128, 'Password must be at most 128 characters.');

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signUpSchema = signInSchema.extend({
  name: z.string().trim().min(1, 'Name is required.').max(100),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * Demo form on the dashboard — a second worked example of the shared contract,
 * this time on a hand-written Express route rather than a Better Auth endpoint.
 *
 * `z.coerce.number()` is the interesting part: form inputs are always strings,
 * and the schema is the single place where "42" becomes 42 — for the browser
 * AND the server, because they run the same parse.
 */
export const demoFormSchema = z.object({
  email: emailSchema,
  amount: z.coerce
    .number({ error: 'Amount must be a number.' })
    .int('Amount must be a whole number.')
    .min(1, 'Amount must be at least 1.')
    .max(1000, 'Amount must be at most 1000.'),
});

export type DemoFormInput = z.infer<typeof demoFormSchema>;

/** Shape returned by POST /api/demo: the payload as the server understood it. */
export const demoResponseSchema = z.object({
  email: z.string(),
  amount: z.number(),
});

export type DemoResponse = z.infer<typeof demoResponseSchema>;

/** Shape returned by GET /api/me. */
export const meResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;
