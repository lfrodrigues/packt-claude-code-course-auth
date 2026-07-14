# 002 — Fix shared package exports, enforce no-floating-promises, small hardening

## Problem

A best-practices review of the repo found:

1. `packages/shared/package.json` exported raw TypeScript (`./src/index.ts`).
   Dev tooling (tsx, Vite) resolves that fine, but the api's production path
   (`npm start` → `node dist/server.js`) crashes with `ERR_MODULE_NOT_FOUND`
   because Node cannot execute `.ts` from a dependency.
2. `eslint.config.js` said "Auth code must not silently swallow rejections" but
   set `@typescript-eslint/no-floating-promises` to `'off'`, and type-aware
   linting was not configured, so the rule could not be enabled.
3. Smaller gaps: no `'error'` listener on the pg `Pool` (an idle-client error
   crashes the process), no `unhandledRejection`/`uncaughtException` handlers
   (crashes exit without a structured log line), and `env.ts` used
   `URL#pathname` for the `.env` path (breaks on Windows / paths with spaces).

## Change

- `packages/shared/package.json`: `main`/`types`/default export point at
  `dist/`; a `development` export condition keeps `./src/index.ts` so dev
  tooling keeps resolving source without a build step. Vite applies that
  condition by default; tsx does not, so the api dev script now runs
  `tsx watch --conditions=development`. Added a `build` script.
- `eslint.config.js`: type-aware linting via `projectService` (with
  `allowDefaultProject` for config/test files outside any tsconfig), scoped to
  `**/*.ts(x)`, and `no-floating-promises` set to `'error'`. The rule surfaced
  no violations in existing code.
- `apps/api/src/db/index.ts`: `pool.on('error', ...)` logging via the
  redacting logger.
- `apps/api/src/server.ts`: `unhandledRejection` / `uncaughtException`
  handlers that log through pino and exit(1).
- `apps/api/src/env.ts`: `fileURLToPath()` instead of `URL#pathname`.

## Verification

- `npm run verify` green.
- `npm run build` then `npm start -w @auth-app/api`: server boots and
  `/healthz` answers — proves Node resolves `@auth-app/shared` from `dist/`.
- `npm run dev` still works from source (development export condition).
