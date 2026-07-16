# 009 — Add knip and Semgrep to the verify gate

## Context

The verify gate already covers types, lint, format, tests, and `npm audit`, but
nothing detects dead code/unused dependencies, and nothing does security-pattern
scanning beyond gitleaks (secrets only). Plan 008 fixed shared-package exports
by hand — knip would have flagged the unused exports mechanically. The user
wants SonarQube-class static analysis without hosting SonarQube; knip + Semgrep
OSS were chosen from a review of Node static-analysis options (dependency-cruiser
was considered lower priority and deferred).

## Approach

Two tools, integrated differently because they distribute differently:

### knip (dead code / unused deps — runs locally and in CI)

- Add `knip` as a root devDependency (new dependency — flagged and approved in
  the conversation that produced this plan).
- Add a root `knip.json` configuring the three workspaces (`apps/api`,
  `apps/web`, `packages/shared`), with entry points: API server entry +
  `app.ts` factory, web `main.tsx`, shared package `exports`. Playwright/vitest
  configs and `scripts/` are declared as entries so they aren't reported as
  unused.
- Add script `"knip": "knip"` and extend `verify`:
  `... && npm run knip && npm run audit`.
- First run will likely surface real findings; fix genuine dead code in the
  same branch, and use `knip.json` `ignore`/`ignoreDependencies` sparingly for
  false positives (each with a comment-adjacent justification in the plan or
  commit).

### Semgrep OSS (security patterns — CI only)

- Semgrep is a Python tool, so it is **not** added to package.json. It runs as
  a CI step in `.github/workflows/ci.yml` after `npm run lint`:

  ```yaml
  - name: Semgrep
    run: |
      pipx run semgrep scan --error --config p/typescript --config p/expressjs .
  ```

  (`--error` makes findings fail the job; rulesets pinned to the public
  `p/typescript` and `p/expressjs` packs, no Semgrep account/App needed.)

- Developers can run the same command locally via `pipx`/`brew` but it is not
  part of `npm run verify`, since verify must not require a Python toolchain.
- **Permissions note:** `.claude/settings.json` denies agent edits to
  `.github/workflows/`. The CI change will be presented as a diff for the user
  to apply (or the user relaxes the rule for this one edit). Do not route
  around the deny.

## Files touched

- `package.json` — knip devDependency, `knip` script, `verify` script
- `package-lock.json` — lockfile update
- `knip.json` — new config
- `.github/workflows/ci.yml` — Semgrep step (**user-applied**, see above)
- Possibly small deletions across `apps/*` / `packages/shared` if knip finds
  real dead code (any `packages/shared` change goes through the ask-first
  permission gate)
- `AGENTS.md` — note knip in the verify definition if the command list changes

## Verification

- `npm run knip` passes locally with zero findings after cleanup.
- `npm run verify` (now including knip) green locally.
- Run the Semgrep command locally once (`pipx run semgrep scan --error
--config p/typescript --config p/expressjs .`) to confirm zero findings
  before pushing the CI change.
- Push branch; CI green including the new Semgrep step proves the workflow
  edit is correct.
- No auth behavior changes, so `npm run smoke` is not strictly required, but
  if knip cleanup deletes anything under `apps/api`, run it anyway.

## Confidence

8/10. The main unknowns are (a) how many findings knip's first run produces —
handled iteratively, not guessed in advance — and (b) exact knip workspace
config syntax, verified against its docs during implementation.

Implementing commits must carry the trailer:
`Plan: docs/plans/009-knip-and-semgrep.md`
