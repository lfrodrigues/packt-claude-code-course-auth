# Run the verify gate until green

1. Ensure Postgres is up: `docker compose up -d` (wait for healthy).
2. Run `npm run verify` (typecheck + lint + test + audit — the definition of green).
3. If it fails, fix the failures and re-run until it passes. Prefer the
   narrowest re-check first (single package/test), full `verify` as the final
   confirmation.

Policy:

- Do NOT weaken, skip, or mock an assertion to make a test pass. Report
  failures you can't fix honestly.
- Do NOT touch generated `apps/api/src/db/schema.ts`, migrations, or auth
  config to silence errors.
- Report the final `verify` output verbatim.
