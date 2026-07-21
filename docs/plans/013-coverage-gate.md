# 013 — Enforce the coverage threshold

## Context

`vitest.config.ts` sets 70% coverage thresholds under the comment _"A threshold
makes coverage a gate. Without one it's a dashboard nobody opens."_ Nothing runs
coverage. `npm test` is `vitest run --project api --project web`, there is no
`test:coverage` script, `verify` doesn't call one, and neither does CI.
`@vitest/coverage-v8` is installed and never invoked.

So the threshold is decorative: the config asserts an enforcement that does not
exist. This is the same class of problem as the `no-floating-promises` rule that
sat at `'off'` beneath a comment saying auth code must not swallow rejections —
a stated intent with nothing behind it. Where a comment expresses intent,
something has to enforce it or the comment has to go.

**Running it exposed a second defect.** The first coverage report read 89.52%
statements — implausibly healthy. The `include` globs were repo-relative
(`apps/*/src/**/*.{ts,tsx}`) while each vitest project sets its own `root`
(`./apps/api`, `./apps/web`), so they matched nothing. That is not an error in
vitest; it silently falls back to reporting only files the tests imported. Every
file with no test at all — `App.tsx`, `DemoForm.tsx`, `ProtectedRoute.tsx`,
`Dashboard.tsx`, `auth-client.ts` — was absent from the report rather than
present at 0%. The metric could only see code that was already tested, which is
the one thing coverage exists to stop. Real figure with the globs fixed: 57.66%
statements, 38.54% branches.

Two smaller items ride along, both about the repo's working surface being clean:
`.codeatlas/` (a local tool artifact) shows up as untracked in every
`git status`, and there is no LICENSE despite the repo being published as a
reference for others to fork.

**A third item is not optional: `verify` is currently red at the audit step**, so
nothing here can be committed until it's resolved. `npm audit --audit-level=high`
reports two high-severity findings, both the same root cause:

```
shell-quote  <=1.8.4   high — Quadratic-complexity DoS in parse() (CWE-407)
                              GHSA-395f-4hp3-45gv
concurrently 9.2.1-9.2.3 || >=10.0.0   high — depends on vulnerable shell-quote
```

This predates this work — it's a new advisory against the tree from
[004-dependency-upgrades.md](./004-dependency-upgrades.md), not something the
coverage change introduced. It gets fixed here because it blocks the gate, and
leaving a red `verify` on the branch while adding a new gate to CI would be
absurd.

## Approach

**Coverage runs in CI, not in `verify`.**

`verify` is the fast gate — pre-push, and the loop an agent runs while working.
The API tests are deliberately serialized (`fileParallelism: false`,
`maxWorkers: 1`) because they share one real database; adding v8 instrumentation
on top of that slows the gate that has to stay fast to stay used. CI is already
the slow gate, so coverage belongs there. `docs/conventions.md` documents the
fast/slow split; coverage becomes its third example.

1. `package.json` — add
   `"test:coverage": "vitest run --coverage --project api --project web"`, and
   fold it into `verify:full`. `verify:full` is documented as "exactly what CI
   runs"; a CI step with no local counterpart would make that line false, which
   is the kind of drift this repo treats as a bug.
2. `.github/workflows/ci.yml` — replace `- run: npm test` with
   `- run: npm run test:coverage`. Same tests, plus the gate, one pass rather
   than two. No new services: Postgres and both migrated databases are already
   up by that point.
3. `vitest.config.ts` — fix the `include` globs to be root-relative
   (`**/src/**/*.{ts,tsx}`) so untested files appear at 0% instead of vanishing,
   and exclude the process entrypoints beside the already-excluded `main.tsx`:
   `server.ts` binds a port, `instrument.ts` installs the Sentry hook. Running
   those is not testing them. Generated `db/schema.ts` stays excluded.
4. `docs/conventions.md` — extend "Fast gate / slow gate" with the reasoning
   above.
5. `README.md` (Scripts table) and `CLAUDE.md` (command table) — add the script
   and adjust the "`verify` is what the pre-push hook runs, `verify:full` is what
   CI runs" wording so it stays literally true now that CI runs one more thing.

**Thresholds: measured floors, not aspirations.** 70 across the board was never
met and never checked. The honest move with a suite this size is to set the
floors at what the suite actually achieves and ratchet from there, so the gate
starts blocking regression today rather than after a test-writing project that
may not happen. `thresholds.autoUpdate: true` writes each rise back into the
config, so the ratchet doesn't depend on anyone remembering.

Explicitly **not** done here: no tests were written and no threshold was set
above what is measured. The four untested web files (`App`, `DemoForm`,
`ProtectedRoute`, `Dashboard`) are where the next points come from — the
`ProtectedRoute` redirect and Dashboard's "don't navigate on a failed sign-out"
are real properties worth asserting, not coverage filler. New tests follow
`.claude/rules/testing.md`.

`packages/shared` reports nothing at all: it has no vitest project, so its files
fall outside both roots. The contract package is invisible to coverage. Noted
rather than fixed — a third project for it is a separate change.

**The audit fix: override `shell-quote`, don't downgrade `concurrently`.**

`npm audit fix --force` proposes `concurrently@9.2.4` — a major _downgrade_ of a
working tool. It proposes that because `concurrently@10.0.3` (the latest) pins
`"shell-quote": "1.8.4"` exactly rather than as a range, so npm cannot lift the
transitive dependency on its own. Nothing else in the tree depends on
`shell-quote`, and patched `1.9.0` / `1.10.0` are published.

So the smaller change is an override in the root `package.json`:

```json
"overrides": { "shell-quote": "^1.10.0" }
```

then `npm install` to regenerate `package-lock.json`. This keeps the current
`concurrently` and moves one transitive package out of the advisory range,
instead of moving a direct dev dependency backwards by a major version to work
around a pin.

The risk is real and worth naming: the upstream pin may be deliberate, and an
override silently substitutes a version the package didn't ask for. `concurrently`
only runs `npm run dev`, so the blast radius is the dev loop and the failure mode
is loud (both servers fail to start). That is verified by running it, not by the
lockfile resolving.

The five moderate findings (`better-auth → drizzle-kit → @esbuild-kit/* →
esbuild`) are **not** fixed here. `--audit-level=high` doesn't fail on them, no
patched `drizzle-kit` is available through `better-auth`, and forcing that chain
means moving the auth library — a change that needs its own plan and its own
`npm run smoke`. Left documented rather than silently carried.

**Hygiene, committed first** (safe and independently verifiable):

- `.gitignore` — add `.codeatlas/` to the tool-artifact group, with a one-line
  comment naming the tool, matching how every other entry is explained.
- Commit the two pending `mcp__render__*` read-only additions already sitting
  in `.claude/settings.json`.
- Add `LICENSE` (MIT).

## Files touched

- `package.json` (`test:coverage`, `verify:full`, `overrides`)
- `package-lock.json` (regenerated by `npm install`, never hand-edited)
- `vitest.config.ts` (include/exclude globs, thresholds, `autoUpdate`)
- `.github/workflows/ci.yml`
- `docs/conventions.md`
- `README.md`, `CLAUDE.md`
- `.gitignore`
- `LICENSE` (new)

## Verification

- `npm run test:coverage` locally with Postgres up; read the report before
  deciding between writing tests and restating the threshold.
- Prove the gate fails: on a scratch branch raise a threshold a few points, push,
  confirm CI goes red, revert. A gate never seen failing isn't yet a gate — the
  same check README's "Prove the guardrails actually hold" applies to the hooks.
- `npm run verify` green, and timed before/after — it must not get slower; that
  is the entire reason coverage went to CI only.
- `npm run verify:full` green (full CI parity).
- `npm run knip` — `@vitest/coverage-v8` was previously never invoked; confirm it
  still passes without needing an `ignoreDependencies` entry now that it is
  genuinely used.
- `git status` clean, with `.codeatlas/` no longer listed.

For the audit fix specifically:

- `npm ls shell-quote` resolves to `1.10.0` under `concurrently`, and
  `npm audit --audit-level=high` exits 0 (the five moderates remain listed and
  are expected).
- **`npm run dev` actually starts both servers.** An override substitutes a
  version upstream pinned; the lockfile resolving proves nothing about
  `concurrently` still working. Boot it, see API on :3005 and web on :5173, load
  the login page.
- `npm run smoke` — auth flow end to end, since the dev loop is how the API gets
  started for it.

## Note on `.claude/`

`.claude/settings.json` is denied by its own deny list and by
`.claude/hooks/protect-files.sh`. Committing the change already in the working
tree is a git operation, not an edit, so that is fine. If the file itself needs
modifying, it gets drafted outside `.claude/` and moved in by a human — the deny
rule does not get loosened for convenience.
