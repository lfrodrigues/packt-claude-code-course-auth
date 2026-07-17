---
description: Run the full verify gate (typecheck + lint + format + test + audit + e2e) until green — matches CI
allowed-tools: Bash(docker compose up -d), Bash(npm run verify:full), Bash(npm run verify), Bash(npm run typecheck), Bash(npm run lint:*), Bash(npm test:*), Bash(npm run e2e)
---

# Run the verify gate until green

1. Ensure Postgres is up: `docker compose up -d` (wait for healthy).
2. Run `npm run verify:full` (typecheck + lint + format + test + audit + e2e —
   this is what CI runs, so it's the real definition of green).
3. If it fails, fix the failures and re-run until it passes. Prefer the
   narrowest re-check first (single package/test, or plain `npm run verify`
   to skip e2e while iterating), `verify:full` as the final confirmation.

Policy:

- Do NOT weaken, skip, or mock an assertion to make a test pass. Report
  failures you can't fix honestly.
- Do NOT touch generated `apps/api/src/db/schema.ts`, migrations, or auth
  config to silence errors.
- Report the final `verify:full` output verbatim.
