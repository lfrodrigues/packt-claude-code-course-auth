---
description: Generate a migration from the Drizzle schema, summarize it, and apply only after confirmation
allowed-tools: Bash(npm run db:generate)
---

# Generate and apply a database migration

1. Run `npm run db:generate` to produce the migration from the current Drizzle
   schema.
2. Print a short human-readable summary of what changed: tables
   added/dropped/renamed, columns, indexes, constraints — before showing raw SQL.
3. Show the generated SQL.
4. STOP and ask for explicit confirmation.
5. Only after the user confirms, run `npm run db:migrate`.

Policy:

- Do NOT hand-edit generated SQL, `apps/api/src/db/schema.ts`, or existing
  migration files. Schema changes flow from `auth.ts` / Drizzle schema →
  regenerate.
- Do NOT apply a migration or drop data without the explicit confirmation in
  step 4 — schema changes are one-way doors.
