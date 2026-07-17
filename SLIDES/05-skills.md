# Section 5 — Skills: Reusable Capability (1:45–2:15)

---

## ⏱ 01:45 · Slide 5.1 — From ad hoc prompting to consistent execution

**Content**

- The pattern: you correct the agent the same way, every session
- A skill moves "the way we do X" from your memory into the repo
- Invoke with `/name` — or the agent loads it when relevant

**Notes / what to do**

- 3 min. Post-break re-energizer. Open with the pain: "Who has typed 'no, we use zod for validation, remember?' more than once?"
- Callback to slide 2.6's ladder: this is the "typed it 3 times → move it a level up" rule in action.

---

## ⏱ 01:48 · Slide 5.2 — Anatomy of a good SKILL.md

**Content**

- **Trigger**: when it applies
- **Procedure**: numbered, concrete steps — commands, not vibes
- **Policy**: the WON'Ts, inline, traveling with the procedure
- Small, single-purpose, testable

**Notes / what to do**

- 4 min. Put a real one on screen (`.claude/commands/plan.md` is short and complete): steps 1–4, then the policy line.
- Highlight the structure: notice how it handles the edge case (plan already exists → refuse unless "supersede"). Good skills encode the edge cases you've already hit.

---

## ⏱ 01:51 · Slide 5.3 — This repo's skill set — all battle-used

**Content**

- `/plan` — scaffold the next-numbered plan file
- `/verify` — run the gate until green
- `/fix` — the narrow remediation loop
- `/ship` — verify + commit with trailer + push
- `/pr` — PR body from the plan file, not a diff summary
- `/smoke`, `/db-migrate`, `/e2e`

**Notes / what to do**

- 3 min. One sentence each; stress "battle-used": every one of these was exercised building this repo, none is decorative.
- Note the pairing: each skill maps to a stage of the plan→ship lifecycle. Together they _are_ the team's workflow, executable.

---

## ⏱ 01:54 · Slide 5.4 — 🎬 DEMO: /plan → /ship end to end

**Content**

- `/plan` scaffolds `docs/plans/00N-<slug>.md`
- Make a small change
- `/ship`: verify runs → commit gets the trailer → push asks for confirmation

**Notes / what to do**

- 6 min live. Pick a genuinely trivial change (e.g. a README touch) so verify is fast. Narrate which layer is acting at each moment: skill drives, hook enforces, permission prompts.
- The push-confirmation prompt is a feature — point at it: "the guardrail and the skill compose; the skill doesn't get to skip the prompt."
- Cleanup plan: do this on a scratch branch you delete after; have the commands pre-typed in a cheat sheet.

---

## ⏱ 01:59 · Slide 5.5 — Policy blocks inside skills

**Content**

- `/ship`: "do NOT commit red", "do NOT force-push", "do NOT use --no-verify"
- `/pr`: "do NOT fabricate a verification section"
- `/fix`: "do NOT delete the assertion or loosen the type"
- The procedure and its guardrails travel together

**Notes / what to do**

- 3 min. These are verbatim from the repo's command files — show one.
- Design insight: a WON'T in CLAUDE.md is global background; a WON'T inside a skill fires exactly when the risky procedure is running. Put the warning where the danger is.

---

## ⏱ 02:02 · Slide 5.6 — Skills your team should write first

**Content**

- `component` — design tokens, a11y, file conventions
- `api-route` — input validation, error handling, typed responses
- `db-migration` — safe schema changes (Prisma / Drizzle)
- `testing` — Playwright / Vitest patterns
- `pre-commit-review` — the self-review checklist
- Heuristic: one skill per task where you keep making the same correction

**Notes / what to do**

- 4 min. These five ship with the course. For each, name the failure it prevents (component → the "fourth component looks different" problem from slide 1.4; api-route → unvalidated input; migration → the one-way door).
- Be honest about scope: start with the one that hurts most, not all five at once.

---

## ⏱ 02:05 · Slide 5.7 — War story: skills composing

**Content**

- One real session: `/verify` found failures → `/fix` drove the narrow loop → `/ship` pushed the branch
- Three skills, one workflow, zero re-prompting
- The workflow lives in the repo, not in your head

**Notes / what to do**

- 2 min. Short and punchy — the compounding payoff slide. Each skill was written once; now entire maintenance sessions run on rails.
- "This is what 'orchestration' means concretely: you designed the rails; the agent runs on them."
- Optional live proof that verify really catches things — break it on purpose, watch it fail, revert:

  ```bash
  # weaken the auth config: hardcode a short min password length
  sed -i '' 's/minPasswordLength: MIN_PASSWORD_LENGTH,/minPasswordLength: 6,/' apps/api/src/auth.ts
  npm test          # "rejects a password shorter than the 12-char minimum" goes red

  # revert
  git checkout apps/api/src/auth.ts
  ```

  This is the WON'T from section 4 made tangible: the test suite defends the security property even against you.

- Bonus beat: have the _agent_ attempt the same edit instead — `auth.ts` is on the "ask" permission list, so the prompt fires first. Two guardrail layers, one demo.
- (`MIN_PASSWORD_LENGTH` lives in `packages/shared/src/schemas.ts` and is deliberately kept in sync with the Better Auth config — worth mentioning. Re-check the exact sed string before the workshop.)

---

## ⏱ 02:07 · Slide 5.8 — Exercise: write your first skill

**Content**

- 8 minutes: draft a ~10-line SKILL.md for a task you repeat weekly
- Must include: trigger, 3+ numbered steps, one policy line (a WON'T)
- Share-out: what did you put in the policy block?

**Notes / what to do**

- ⚠️ TODO: ask Packt whether attendees can be given exercise work and asked to share results in the chat — confirm before keeping this slide.
- 8–10 min total: 6 writing, 3 share-out. Circulate while they write.
- Prompt the stuck: "what did you last explain twice to a teammate — or to the agent?"
- The share-out question is deliberately about the _policy_ line — it forces thinking about failure modes, which is the section's real lesson.
