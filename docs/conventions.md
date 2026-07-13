# Why the scaffold is shaped this way

Every structural decision here exists to make one of two things true: **good agent
output is more likely**, or **bad output cannot land**. This file is the rationale;
the README covers usage.

## Strict TypeScript is an agent guardrail

`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` — the point
isn't pedantry. Each flag converts a class of plausible-looking mistake into a
compile error **the agent can see and fix itself**, with no human in the loop.
During this repo's own build, `exactOptionalPropertyTypes` caught a
`transport: undefined` that pino would have rejected at runtime.

## `packages/shared` is the boundary, made physical

One zod schema validates the login form in the browser _and_ the payload on the
server. Rename a field and both sides fail to compile — the contract can't drift,
because there is only one copy of it.

## One `verify`, three callers

`typecheck && lint && test && audit`, invoked identically by the pre-push hook,
CI, and humans. One definition of green means no "works locally, fails in CI"
drift — and no arguing about which check counts.

## Fast gate / slow gate

Pre-commit runs seconds of checks (gitleaks, lint-staged, tsc). The full suite
waits for pre-push, and CI backstops everything. A gate slow enough to be
annoying gets bypassed with `--no-verify`, and a bypassed gate is worse than
none — it sells confidence it isn't providing.

## Deny the gates, ask about the boundary

`.claude/settings.json` denies edits to secrets and to the gates themselves
(`.husky/`, workflows, `.claude/`, gitleaks config) — an agent that can edit its
own gates has no gates. But `auth.ts` is _ask_, not deny: the agent has to be
able to work on it, so the honest control is a human reviewing the diff. A
guardrail that blocks useful work gets switched off, and a switched-off guardrail
protects nothing.

## Enforce where the agent isn't

Local permission rules vanish under `--dangerously-skip-permissions` and never
applied to human collaborators. CODEOWNERS + branch protection put the review
requirement on GitHub's side of the wall. The principle generalizes: **anything
the agent could disable, enforce somewhere the agent can't reach.**

## Tests assert what a passing implementation could still get wrong

The suite reads the `account` table to prove the password is scrypt-hashed,
presents a tampered cookie to prove the signature is checked, re-presents a
signed-out cookie to prove revocation is immediate, and fires six bad logins to
prove the limiter is on. Happy-path tests confirm the feature exists; these
confirm it's safe. (The sign-out test earned its keep before this repo ever
shipped: it caught `cookieCache` letting revoked sessions live for five extra
minutes.)

## Generated code is denied, not reviewed

`db/schema.ts` comes from the Better Auth CLI. Hand-editing it is _always_ wrong
— the fix is regeneration — so the permission rule denies the edit outright.
Deny is the right tool exactly when there is no legitimate case to review.

## The plan trailer is a hook, not a habit

Every commit must reference a plan file that exists (`.husky/commit-msg`
enforces it). The repo's history is therefore self-documenting:
`git log --grep='^Plan:'` reconstructs the intent behind every change.
