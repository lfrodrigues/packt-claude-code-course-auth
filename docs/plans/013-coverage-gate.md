# 013 — Enforce the coverage threshold

## Context

`vitest.config.ts` sets 70% coverage thresholds under the comment _"A threshold
makes coverage a gate. Without one it's a dashboard nobody opens."_ Nothing runs
coverage. `npm test` is `vitest run --project api --project web`, there is no
`test:coverage` script, `verify` doesn't call one, and neither does CI.
`@vitest/coverage-v8` is installed and never invoked.

So the threshold is decorative — the same class of problem as the
`no-floating-promises` rule that sat at `'off'` beneath a comment saying auth
code must not swallow rejections. Where a comment expresses intent, something
has to enforce it or the comment has to go.

**Running it exposed a second defect.** The first report read 89.52% statements —
implausibly healthy. The `include` globs were repo-relative
(`apps/*/src/**/*.{ts,tsx}`) while each vitest project sets its own `root`, so
they matched nothing. Vitest doesn't error on that; it silently reports only
files the tests imported, so every untested file (`App.tsx`, `DemoForm.tsx`,
`ProtectedRoute.tsx`, `Dashboard.tsx`, `auth-client.ts`) was absent rather than
at 0%. The metric could only see code that was already tested. Real figure with
the globs fixed: 57.66% statements, 38.54% branches.

Two smaller items ride along: `.codeatlas/` shows up untracked in every
`git status`, and there's no LICENSE despite the repo being published to fork.

**Also blocking: `verify` is red at the audit step.** Two high-severity findings,
one root cause — `shell-quote <=1.8.4` (GHSA-395f-4hp3-45gv, quadratic DoS in
`parse()`) reached via `concurrently`. Predates this work; fixed here because it
blocks the gate.

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
met and never checked. Set the floors at what the suite actually achieves so the
gate blocks regression today; `thresholds.autoUpdate: true` writes each rise back
into the config, so the ratchet doesn't depend on anyone remembering.

Explicitly **not** done: no tests written, no threshold set above what's
measured. The four untested web files (`App`, `DemoForm`, `ProtectedRoute`,
`Dashboard`) are where the next points come from. `packages/shared` reports
nothing at all — no vitest project, so it falls outside both roots; noted, not
fixed.

**The audit fix: override `shell-quote`, don't downgrade `concurrently`.**

`npm audit fix --force` proposes `concurrently@9.2.4`, a major downgrade — only
because `concurrently@10.0.3` pins `"shell-quote": "1.8.4"` exactly, so npm can't
lift it. Nothing else depends on `shell-quote` and patched 1.10.0 is published,
so a root override is the smaller change:

```json
"overrides": { "shell-quote": "^1.10.0" }
```

An override substitutes a version upstream didn't ask for, so this is verified by
running `npm run dev`, not by the lockfile resolving. Blast radius is the dev
loop; failure is loud.

The five moderates (`better-auth → drizzle-kit → @esbuild-kit → esbuild`) are
**not** fixed — `--audit-level=high` doesn't fail on them, and forcing that chain
means moving the auth library, which needs its own plan and smoke run.

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

Dependency upgrades (below) additionally touch `package.json` /
`package-lock.json` per batch, `packages/shared/src/schemas.ts` (zod 4), and
possibly `apps/api/src/logger.ts` (pino-http 11).

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

## Dependency upgrades (added after the first commit landed)

Dependabot opened #23–#26, plus six stale dev deps. Method from
[004-dependency-upgrades.md](./004-dependency-upgrades.md): bump → `verify` → fix,
grouped by risk, each batch its own commit so a later failure has one cause.

### Batch 0 — `deps:sync`

`zod` is declared in both `packages/shared` and `apps/api`. Bumping one alone
installs two majors, and a schema built by one copy won't validate against the
other — a runtime failure `tsc` can't see. Batch 4 is exactly that risk.

A CLAUDE.md note would be advisory, so both: a WON'T in `CLAUDE.md`, and
`scripts/check-dep-sync.mjs` wired into `verify` as `deps:sync`. Proved it fails
on drift before wiring it in.

### Batch 1 — patch/minor

`react`/`react-dom` 19.2.8 · `@sentry/node` 10.67.0 · `prettier` 3.9.6 ·
`vite` 8.1.5 · `lint-staged` 17.1.0 · `typescript-eslint` 8.65.0

`deps:sync` caught `vite` bumped at root only — the check earned its keep on the
first real batch.

### Batch 2 — `pino-http` 10.5.0 → 11.0.0

Collapses a duplicate: `pino-http@10` nested `pino@9.14.0` while `apps/api`
depends on `pino@10.3.1`. v11 requires `pino@^10`.

Touches logging, so it inherits the WON'T. Verified by booting the API, running
`smoke`, and reading the log for plaintext `cookie`/`authorization` — all still
`[redacted]`.

### Batch 3 — `@testing-library/jest-dom` 6.9.1 → 7.0.0

Peer `@testing-library/dom >=10 <11`, satisfied by the installed 10.4.1. One
import site: `apps/web/tests/setup.ts`.

### Batch 4 — `zod` 3.25.76 → 4.4.3

The contract package — `packages/shared/**` is on `ask`, plan mode required.
`better-auth@1.6.23` already depends on `zod@^4.3.6`, so the tree ran two majors
side by side; this dedupes them.

Three breaks, all confirmed by running them, not by reading changelogs:

- **`invalid_type_error` removed** (`schemas.ts`) → the unified `error` param. A
  hard compile error in v4; had it merely been ignored it would have silently
  swapped our message for zod's default.
- **`.email()` deprecated** in favour of top-level `z.email()` — **do not
  migrate**, this plan first said to and was wrong. `z.email()` validates
  _before_ `.trim()`/`.toLowerCase()`, so `"  ADA@Example.com  "` would 400 at
  signup instead of normalizing. Comment in `schemas.ts` records why.
- **`ZodTypeAny` now infers `unknown`** (`auth.ts`), breaking
  `{ ...ctx.body, ...parsed.data }`. Typed the map to
  `z.ZodType<SignInInput | SignUpInput>` — stricter than the `any` it replaced.
  Only `tsc` caught this; every test passed.

Verified with `verify`, `e2e`, `smoke` (6/6), and curl against the live API:
padded/mixed-case email normalizes, `"42"` coerces to `42`, and every custom
message survives. `DemoForm.tsx` still has no test, so the browser half of the
coerce path stays unasserted.

### Deferred — `typescript` 5.9.3 → 7.0.2

Blocked upstream: `typescript-eslint@8.65.0` declares
`"typescript": ">=4.8.4 <6.1.0"`. Taking TS 7 disables type-aware linting — the
guardrail the `no-floating-promises` fix depended on. Revisit when a TS 7 peer
range ships; don't reach for `--force` or `--legacy-peer-deps`, which silence the
warning without resolving it.

### Dependabot PRs

#23–#26 carry their own lockfile resolutions and will conflict with these
batches. Close them referencing this plan, or merge them and drop the matching
batch — not both.

## Note on `.claude/`

`.claude/settings.json` is denied by its own deny list and by
`.claude/hooks/protect-files.sh`. Committing the change already in the working
tree is a git operation, not an edit, so that is fine. If the file itself needs
modifying, it gets drafted outside `.claude/` and moved in by a human — the deny
rule does not get loosened for convenience.
