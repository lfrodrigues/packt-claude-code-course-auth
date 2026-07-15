---
paths:
  - 'packages/shared/**'
---

# You are editing the wire contract

These schemas are imported by **both** `apps/api` and `apps/web`. A change here
changes what the two sides agree on. (`packages/shared/CLAUDE.md` has the
workspace basics; these rules are the failure modes.)

- **Never loosen a validator to fix a client bug.** If the browser is sending
  something the schema rejects, the browser is wrong — fix the form, not the
  contract. A loosened schema also loosens what the _server_ accepts.
- **Update both call sites in the same commit.** Grep for every importer of the
  symbol you're changing before you change it.
- **Parse errors reach users.** Keep zod messages human-readable and free of
  internals — they render in the UI and return in API 400s.
- **Renaming or narrowing a field is a breaking change.** Prefer adding an
  optional field; if you must break, say so in the plan and touch api + web +
  tests together.
