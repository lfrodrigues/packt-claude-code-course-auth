# 007 — Sentry error monitoring + a crash endpoint to prove it works

## Context

The API currently swallows unhandled errors into a server-side `logger.error` and
a generic `500` ([`apps/api/src/error-handler.ts`](../../apps/api/src/error-handler.ts)).
There is no way to see those errors in aggregate — no alerting, no stack traces
off-box. This adds [Sentry](https://sentry.io) error monitoring to the Express
API, plus a small **crash endpoint that deliberately throws**, so we can confirm
end-to-end that an unhandled error actually reaches Sentry. It also registers the
hosted **Sentry MCP** server so we can triage issues directly from Claude Code
later.

Decided with the user:

- The "crash API" is a **throwaway crash endpoint** (`GET /api/crash`), not a
  real domain resource — no DB, no schema, no migration. Scope stays auth-only
  everywhere else; this exists solely to prove Sentry capture and is trivial to
  delete.
- `@sentry/node` is a **new backend dependency** — flagged and approved.

## Approach

1. **Dependency:** add `@sentry/node` (v10) to `apps/api`.
2. **Config** (`env.ts`): two **optional** vars — `SENTRY_DSN` (url) and
   `SENTRY_ENVIRONMENT` — so the app still boots and all tests still run with no
   Sentry configured. `.env.example` documents `SENTRY_DSN`.
3. **Init** (new `instrument.ts`): calls `Sentry.init()` only when `SENTRY_DSN` is
   set. Imported as the **first line** of `server.ts`, before `./app.js`, because
   Sentry's auto-instrumentation must load before Express. `createApp()` in
   `app.ts` (used by tests) stays Sentry-agnostic.
4. **Error handler** (`app.ts`): `Sentry.setupExpressErrorHandler(app)` registered
   **after** the routes and **before** the existing `notFoundHandler` /
   `errorHandler`. Sentry only captures and calls `next(err)`, so the existing
   handler still returns the generic `{ error: 'Internal server error' }` —
   **no stack trace leaks to the client.** Safe no-op when `init` was skipped.
5. **Crash route** (new `routes/debug.ts`): `GET /error` triggers a genuine
   runtime bug rather than an explicit `throw` — it averages an empty array
   (`0 / 0 = NaN`), then uses that `NaN` as an array length, which throws
   `RangeError: Invalid array length`. Mounted in `app.ts` only when
   `NODE_ENV !== 'production'`, so it never ships publicly.
6. **MCP servers** (`.mcp.json`, repo root, project scope): register two servers,
   documented in the README's new "MCP servers" section —
   - `sentry` — hosted remote server (`https://mcp.sentry.dev/mcp`), authorized
     interactively via `/mcp` OAuth (no token in the repo), for reading issues and
     stack traces produced by the crash route above.
   - `semble` — local stdio server (`uvx semble`), already referenced by
     `AGENTS.md`'s code-search guidance; added here so it's actually registered.

## Files touched

- `apps/api/package.json` — add `@sentry/node`
- `apps/api/src/env.ts` — optional `SENTRY_DSN`, `SENTRY_ENVIRONMENT`
- `apps/api/src/instrument.ts` — **new**, `Sentry.init`
- `apps/api/src/server.ts` — import `./instrument.js` first
- `apps/api/src/app.ts` — `setupExpressErrorHandler` + mount `debugRouter` (non-prod)
- `apps/api/src/routes/debug.ts` — **new**, crash endpoint
- `apps/api/tests/debug.test.ts` — **new**, asserts generic 500, no stack leak
- `.env.example` — document `SENTRY_DSN` (deny-listed for agent edits — flagged for the user to add by hand)
- `.mcp.json` — **new** (repo root), `sentry` + `semble` MCP servers
- `README.md` — new "MCP servers" section explaining why each is registered and how to use it

## Verification

1. `npm run verify` stays green (Sentry off in tests — no DSN).
2. New test: `GET /api/crash` → `500` with the generic body and **no** stack
   trace, locking in that the error path still redacts.
3. By hand: set `SENTRY_DSN` in `.env`, `npm run dev`, `curl .../api/crash`
   → event appears in Sentry, caller still gets a generic 500.
4. `npm run smoke` — auth flow unaffected by the added middleware.
5. MCP: `/mcp` → authorize Sentry (OAuth) → list recent issues; the crash from
   step 3 should appear.
