# 006 — Path-scoped rules + React 19 doc references

## Context

`.claude/rules/` currently contains only `security.md`, which loads when auth,
db, or route files are touched. A review of the repo's invariants (AGENTS.md)
showed several that are documented globally but not restated where they trigger:
the shared zod contract, migration discipline, test integrity, and the plan
format itself. Path-scoped rules load exactly when a matching file is read or
edited, so they put the guidance in context at the moment it matters without
bloating every session.

Separately, the dependency upgrade in [004-dependency-upgrades.md](./004-dependency-upgrades.md)
moved React 18→19 but left stale "React 18" references in the docs.

## Approach

Add four rule files to `.claude/rules/`, each with a `paths:` frontmatter glob:

1. **`shared-contract.md`** — `packages/shared/**`. Any schema change is a
   breaking change for both api and web: check every importer, never loosen a
   validator to fix a client bug, keep parse errors user-safe. Consolidates
   rather than duplicates what `packages/shared/CLAUDE.md` says (trim that file
   if it overlaps).
2. **`migrations.md`** — `apps/api/drizzle/**`. Never edit an applied
   migration; additive only; the regenerate sequence
   (`db:auth-schema` → `db:generate` → `db:migrate`); ask before applying.
3. **`testing.md`** — `**/*.test.ts`, `apps/api/tests/**`, `e2e/**`. Never
   delete or weaken an assertion to go green; tests hit real Postgres by
   design (don't mock the DB); `verify` vs `verify:full` scope.
4. **`plans.md`** — `docs/plans/**`. Plan structure per `docs/plans/README.md`
   (Context, approach taken, files touched, verification), numbering
   convention, and the `Plan:` trailer requirement.

Doc fixes:

- `README.md:12` — "React 18" → "React 19".
- `apps/web/CLAUDE.md:3` — "React 18" → "React 19".
- (`004-dependency-upgrades.md` mentions "React 18→19" — that's historical and
  correct; leave it.)

## Files touched

- `.claude/rules/shared-contract.md` (new)
- `.claude/rules/migrations.md` (new)
- `.claude/rules/testing.md` (new)
- `.claude/rules/plans.md` (new)
- `README.md`
- `apps/web/CLAUDE.md`

Note: `.claude/**` edits are denied by `.claude/settings.json`, so the rule
files must be approved/created by the user — the agent drafts them (e.g. in a
scratch location) and the user moves or approves them. This is the guardrail
working as designed.

## Verification

- Rules: open a file matching each glob in a fresh session and confirm the
  rule appears in context; confirm no rule loads at session start (all four
  have `paths:` frontmatter).
- Docs: `grep -ri "react 18" README.md apps/` returns nothing.
- `npm run verify` still green (docs-only change to enforced paths, but the
  gate is cheap insurance).
