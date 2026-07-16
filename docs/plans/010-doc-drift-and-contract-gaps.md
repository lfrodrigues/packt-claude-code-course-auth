# 010 — Fix doc drift, run Semgrep locally, close contract gaps

## Context

A review of the repo against its own documentation found two kinds of problems.
First, documentation drift: `verify` gained knip (plan 009) but the README,
`AGENTS.md`, and `/verify` command still describe the old pipeline, and Semgrep
runs in CI only while the docs claim local and CI share one definition of green.
Second, code that contradicts the documented story: the "shared contract" is not
actually enforced server-side (only `MIN_PASSWORD_LENGTH` reaches the API), the
login form validates normalized values but submits raw state, sign-up has no
custom rate limit, and the dashboard swallows `/api/me` and sign-out failures.

Also folded in: `AGENTS.md` merges into `CLAUDE.md` (this repo is Claude Code
only; context load is identical since `@AGENTS.md` was an import), and the README
prerequisites expand to list every external tool the gates assume (pipx/Semgrep,
gitleaks, Playwright browsers, uv).

## Approach

- **Semgrep locally**: add a root `semgrep` script (`pipx run semgrep scan
--error --config p/typescript --config p/expressjs .` — same flags as CI) and
  append it to `verify:full`. It stays out of the fast `verify` loop; registry
  configs need network per scan, and pipx caches the venv.
- **Docs**: align every description of `verify` with the actual script
  (typecheck + lint + format + test + knip + audit); document `verify:full` =
  verify + e2e + semgrep = CI; expand README prerequisites; fix the semble
  command in the MCP table (`uvx --from semble[mcp] semble`).
- **Merge `AGENTS.md` into `CLAUDE.md`** and delete it; update references in
  README and `docs/conventions.md`.
- **Server-side contract**: `hooks.before` in `auth.ts` parses sign-up/sign-in
  bodies with the shared schemas, rejects invalid payloads with a 400, and
  replaces the body with the parsed (trimmed, lowercased) data.
- **Client**: `Login.tsx` submits `parsed.data` instead of raw state.
- **Rate limit**: custom rule for `/sign-up/email` (5/60) plus a test.
- **Dashboard**: surface `/api/me` failure instead of an eternal "…"; keep the
  user on the page with an error if sign-out fails.
- `docs/plans/008-...` heading corrected from `# 002` to `# 008` — a mechanical
  typo fix, not a rewrite of the record.
- **Second contract example** (added mid-implementation, at user request): a
  `demoFormSchema` (email + coerced number) in `packages/shared`, a protected
  `POST /api/demo` route that validates with it (the hand-written-Express
  counterpart to the Better Auth hook), and a dashboard form that runs the same
  schema client-side and submits the parsed data.

## Files touched

`package.json`, `README.md`, `CLAUDE.md` (absorbs deleted `AGENTS.md`),
`docs/conventions.md`, `docs/plans/008-shared-exports-and-floating-promises.md`,
`.claude/commands/verify.md`, `apps/api/src/auth.ts`,
`apps/api/tests/auth.test.ts`, `apps/web/src/routes/Login.tsx`,
`apps/web/src/routes/Dashboard.tsx`, `packages/shared/src/schemas.ts`,
`apps/api/src/routes/demo.ts` (new), `apps/api/src/app.ts`,
`apps/web/src/components/DemoForm.tsx` (new), `knip.json`.

## Verification

- `npm run verify` green; `npm run verify:full` once to prove the local Semgrep
  step runs.
- `npm run smoke` against a running server for the auth-flow changes.
- New tests: sign-up rejected with 400 on an invalid email (server-side schema),
  sign-up rate limited on the sixth attempt, email normalization
  (`" Ada@Example.com "` signs up as `ada@example.com`).
