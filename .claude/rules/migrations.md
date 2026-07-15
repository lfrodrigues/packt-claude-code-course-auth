---
paths:
  - 'apps/api/drizzle/**'
---

# You are in migration territory

Migrations are one-way doors: once applied to any real database, they are
history, not code.

- **Never edit a migration that has been applied — anywhere,** including a
  teammate's dev DB. Write a new migration that corrects it.
- **Additive only, unless the plan explicitly says otherwise.** Dropping a
  column or table destroys data; ask first, every time.
- **Don't write migrations by hand for auth tables.** The flow is: edit
  `apps/api/src/auth.ts` → `npm run db:auth-schema` → `npm run db:generate` →
  review the generated SQL → ask → `npm run db:migrate`.
- **Never apply (`db:migrate`, `drizzle-kit migrate`) without asking.** The
  permission rules enforce this; don't route around them.
- Review generated SQL before committing it — the generator is good, not
  infallible (watch for unintended drops on renames).
