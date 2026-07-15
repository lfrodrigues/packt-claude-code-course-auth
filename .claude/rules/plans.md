---
paths:
  - 'docs/plans/**'
---

# You are writing a plan

Plans are the repo's memory. `docs/plans/README.md` is the spec; these are the
rules that keep them useful.

- **Structure:** Context (why, what prompted it) → the approach actually taken
  (not a survey of alternatives) → files touched → **how it will be verified**
  (what gets run, what gets driven by hand).
- **Numbering:** next `NNN` in sequence, zero-padded, kebab slug
  (`006-short-slug.md`). Never reuse or renumber.
- **Never rewrite a plan after its commits have landed** — it's a record of
  what was believed at the time. Supersede with a new plan that references the
  old one.
- Every implementing commit needs the trailer
  `Plan: docs/plans/NNN-slug.md`; the `commit-msg` hook rejects commits
  without it, and the file must exist.
- Before implementing, self-score confidence 1–10; below 8, the plan should
  name what's being guessed and the question to ask.
