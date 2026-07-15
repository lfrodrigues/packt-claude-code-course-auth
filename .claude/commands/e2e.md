---
description: Run the Playwright e2e suite (CI runs this too)
allowed-tools: Bash(docker compose up -d), Bash(npm run e2e), Bash(npx playwright install:*)
---

# Run the e2e suite

1. Ensure Postgres is up: `docker compose up -d` (wait for healthy).
2. Run `npm run e2e`. If Playwright's browser is missing, install it with
   `npx playwright install chromium` and retry once.
3. Report the result verbatim, including the failing spec names if red.

Policy:

- Do NOT weaken, skip, or mock an assertion to make a test pass. Report
  failures you can't fix honestly.
- Do NOT loosen CORS, cookie flags, or `trustedOrigins` to fix a failing spec —
  that is usually the guardrail working.
