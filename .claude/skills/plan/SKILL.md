---
description: Scaffold the next-numbered plan file in docs/plans/
argument-hint: <feature-slug>
---

# Scaffold a plan file

Feature slug: $ARGUMENTS

1. Find the highest `NNN` in `docs/plans/` and use `NNN+1` (zero-padded, 3
   digits).
2. If a plan for the same slug already exists, REFUSE and point at it — unless
   the user explicitly says "supersede", in which case note the superseded plan
   in the new file's Context.
3. Create `docs/plans/NNN-<slug>.md` following `docs/plans/README.md`: Context
   (why, what prompted it), the approach actually taken (not a survey of
   alternatives), files touched, and how it will be verified.
4. Remind: every implementing commit needs the trailer
   `Plan: docs/plans/NNN-<slug>.md` — the commit-msg hook enforces it.

Policy: do NOT commit anything as part of this command.
