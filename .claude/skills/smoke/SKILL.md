---
description: Drive the real auth flow (signup → session → sign-out → sign-in) against a running server
allowed-tools: Bash(docker compose up -d), Bash(npm run smoke), Bash(npm run dev:api:*)
---

# Auth-flow smoke test

1. Ensure Postgres is up (`docker compose up -d`) and the API is running; if it
   isn't, start it in the background (`npm run dev:api`) and wait for
   `/healthz` to answer.
2. Run `npm run smoke`.
3. Report each check's result. On failure, report the failing step verbatim —
   do not retry your way past it or patch the script to make it pass.

Policy:

- This is the "verify before claiming" step for anything touching auth. Run it
  before saying an auth change works.
- Do NOT print credentials, cookies, or session tokens.
