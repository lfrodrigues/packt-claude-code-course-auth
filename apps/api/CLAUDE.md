# apps/api

Express 5 + Better Auth + Drizzle + Postgres.

## Traps that bite here

**Middleware order in `app.ts` is load-bearing.** The Better Auth handler is
mounted _before_ `express.json()`. Two ways to break it, both of which look fine
in review:

- Move `express.json()` above it → Better Auth reads the raw body itself, so a
  consumed stream makes every auth request **hang on "pending" forever**. No error,
  no stack trace, just a request that never resolves.
- Write `"/api/auth/*"` (Express 4 syntax) → Express 5 needs the **named splat**,
  `"/api/auth/*splat"`, and throws a path-to-regexp error at boot.

**`src/db/schema.ts` is generated.** Never hand-edit it. To change the schema:

```bash
npm run db:auth-schema   # Better Auth CLI → src/db/schema.ts
npm run db:generate      # drizzle-kit    → drizzle/*.sql
npm run db:migrate       # apply it
```

Skipping `db:generate`/`db:migrate` leaves you with correct _types_ over an empty
_database_ — a passing typecheck on an app that cannot work. If a query fails with
"relation does not exist", that's this.

**Rate limiting behind a proxy shares one bucket.** In dev (Vite proxy) Better
Auth can't see a client IP, so every client shares a single per-path bucket —
fine locally, wrong in production. When deploying behind a proxy/LB, set
`advanced.ipAddress.ipAddressHeaders` (e.g. `x-forwarded-for`) so limits apply
per client, not to everyone collectively.

## Rules

- Tests run against `auth_app_test` and truncate tables between cases. Never point
  `TEST_DATABASE_URL` at the dev database.
- New protected routes copy the pattern in `routes/me.ts`: `auth.api.getSession()`,
  and 401 when it returns null. Do not check for the mere _presence_ of a cookie —
  `getSession()` verifies the signature; a truthiness check on `req.headers.cookie`
  is trivially forgeable.
- `env.ts` parses config at boot. Add new config there, not as bare
  `process.env.FOO` at the call site.
- The logger redacts secrets. Don't reach around it with `console.log`.
