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

/** Shape returned by GET /api/me. */
export const meResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;
