---
paths:
  - '**/*.test.ts'
  - '**/*.test.tsx'
  - 'apps/api/tests/**'
  - 'e2e/**'
---

# You are editing tests

A test suite is only worth what its assertions check.

- **Never delete, weaken, or skip an assertion to make a suite pass.** A red
  test is information; a green suite bought by removing the check is a lie.
  Report the failure instead.
- **Tests hit a real Postgres on purpose.** Don't mock the DB layer — the
  point of these tests is that the real auth stack works against the real
  schema. If Postgres isn't up: `docker compose up -d`.
- **Rate limiting is enabled in dev/test.** If a test trips the 429, that's
  the guardrail working — space out the calls or reset state; don't disable
  the limiter.
- Know the gates: `npm test` is the unit/integration suite, `npm run verify`
  is the local definition of green, `npm run verify:full` adds Playwright e2e
  and is what CI actually requires.
- New auth behavior needs a test that would fail if the check were removed —
  test the denial, not just the happy path.
