---
paths:
  - 'apps/api/src/auth.ts'
  - 'apps/api/src/db/**'
  - 'apps/api/src/routes/**'
  - 'apps/api/drizzle/**'
---

# You are editing security-critical code

These rules load automatically whenever you open auth, database, or route files.

## Before you change anything here

State what you are changing and **why it is safe**. If you cannot articulate the
blast radius, you are below an 8 on the confidence scale — stop and ask.

## Non-negotiables

- **Password hashing is scrypt, Better Auth's default. Do not override it.** Any
  custom `password.hash` / `password.verify` is a rewrite of the one piece of this
  system that must not be wrong.
- **Rate limiting stays enabled**, including in development. Better Auth turns it
  off in dev by default; this repo deliberately turns it back on. Removing it
  "because it's annoying in tests" ships an unthrottled login endpoint.
- **Session cookies stay `HttpOnly` + `SameSite=Lax`.** Loosening either to fix a
  cross-origin problem is treating the symptom — fix the proxy or `trustedOrigins`.
- **`trustedOrigins` is an allowlist.** Never widen it to `*`.
- **Never weaken a check to make a test pass.** A failing auth test is information.
  Report it.
- **Never return the raw error to the client.** Stack traces disclose file layout,
  dependency versions, and query shapes. The error handler exists for this.

## Schema changes

`db/schema.ts` is generated. Edit `auth.ts`, then:
`npm run db:auth-schema` → `npm run db:generate` → `npm run db:migrate`.

Migrations are one-way doors. Ask before applying one.
