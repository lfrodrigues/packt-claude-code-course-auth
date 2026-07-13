# Plans live with the code

Every meaningful change to this repo starts as a plan in this directory, and the
commit that implements it carries a trailer pointing back at it:

```
Plan: docs/plans/001-auth-login.md
```

## Why

Six months from now, a diff tells you _what_ changed. It cannot tell you what was
considered and rejected, what constraint forced a decision, or what the author
believed at the time. The plan can — and because it's committed with the code,
it's versioned, browsable on GitHub, and one `git log` away:

```bash
git log --grep='^Plan:'          # every planned change, with its plan
```

## How

1. Write the plan as `docs/plans/NNN-short-slug.md` (next number, kebab slug).
2. Commit it with — or before — the code that implements it.
3. Add the `Plan:` trailer to every implementing commit.

The `commit-msg` hook **enforces** step 3: no trailer, no commit, and the trailer
must point at a file that exists. A convention that's merely documented erodes;
this one is a gate.

## What a plan should contain

Context (why this change, what prompted it), the approach actually taken (not a
survey of alternatives), files touched, and — most importantly — **how it was
verified**: what was run, what was driven by hand, what would have caught a
regression. See [001-auth-login.md](./001-auth-login.md), the plan that built
this repo, for a worked example.
