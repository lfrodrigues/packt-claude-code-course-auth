# Section 4 — Production Guardrails and Confidence Loops (1:15–1:40)

---

## ⏱ 01:15 · Slide 4.1 — Trust is a mechanism, not a feeling

**Content**

- Wrong question: "do you trust the agent?"
- Right question: "what makes its output safe to trust?"
- Four layers: permissions → hooks → CI → human review

**Notes / what to do**

- 2 min. Frame the section: everything so far made good output _likely_; this section makes bad output _caught_.
- Sketch the four layers as concentric rings — each one catches what the previous missed.

---

## ⏱ 01:17 · Slide 4.2 — Permission rules: deny, ask, allow

**Content**

- `.claude/settings.json`, committed to the repo
- **deny**: `.env`, `.husky/`, `.github/workflows/`, `.claude/`, generated `db/schema.ts`
- **ask**: `auth.ts`, `packages/shared/`, migrations
- **allow**: read-only checks — no prompt fatigue

**Notes / what to do**

- 3 min. Open the actual settings.json. Explain the logic of each tier: deny = things no sane change touches casually (including the guardrails themselves — the agent can't edit `.claude/`); ask = high blast radius, human confirms; allow = keep the loop fast.
- Note the self-protection: the settings file denies edits to itself. Anything an agent could disable…

---

## ⏱ 01:20 · Slide 4.3 — 🎬 DEMO: a guardrail firing

**Content**

- Live: ask Claude to add a line to `.env`
- The edit is denied
- The agent reports what it wanted and why — it does not route around

**Notes / what to do**

- 4 min live. Prompt: "add SENTRY_DSN=test to .env". Show the denial.
- The teachable moment is the agent's _response_ to denial: CLAUDE.md explicitly says "that is the guardrail working — don't route around it; tell the user." Read that passage aloud while the denial is on screen.
- Fallback: screenshot sequence of a previous denial.

---

## ⏱ 01:24 · Slide 4.4 — WON'T rules: phrased so violations show in a diff

**Content**

- WON'T weaken, skip, or mock an auth check to make a test pass
- WON'T hand-edit generated `db/schema.ts`
- WON'T commit or push unless explicitly asked
- WON'T loosen CORS / cookie flags / trustedOrigins to fix a bug
- Each one is _checkable in a diff_ — not "be careful", but "never do this visible thing"

**Notes / what to do**

- 3 min. Read two aloud from CLAUDE.md's WON'T section. Explain the phrasing discipline: "write high-quality code" is unenforceable; "WON'T delete an assertion" is visible in review.
- The auth-check one earns its own beat: "a green suite bought by deleting the assertion is worse than a red one, because it lies."

---

## ⏱ 01:27 · Slide 4.5 — Hooks: enforcement the agent can't skip

**Content**

- `.husky/` git hooks: pre-commit (lint-staged), commit-msg (Plan: trailer), pre-push (verify)
- `.claude/hooks/`: format-on-edit after every Write
- Both directories are deny-listed — the agent can't edit its own cage

**Notes / what to do**

- 3 min. Show `.husky/pre-push` (you had it open earlier — it's the thing between the agent and the remote).
- Distinguish the two hook systems for beginners: git hooks fire on git operations (any actor); Claude hooks fire on agent tool calls. Belt and suspenders.

---

## ⏱ 01:29 · Slide 4.6 — 🎬 DEMO: the commit-msg hook rejecting a commit

**Content**

- Live: commit without a `Plan:` trailer → rejected
- Add the trailer → accepted
- The convention is enforced, not encouraged

**Notes / what to do**

- 3 min live. Copy-paste sequence (safe: scratch branch, cleaned up at the end):

  ```bash
  git checkout -b demo/hook-rejection
  echo "demo" >> README.md
  git add README.md

  # 1) rejected — no Plan: trailer
  git commit -m "test: demo commit"

  # 2) accepted — trailer present
  git commit -m "test: demo commit

  Plan: docs/plans/001-auth-login.md"

  # cleanup
  git checkout chore/agent-workflow-improvements
  git branch -D demo/hook-rejection
  ```

- Callback to slide 2.2: "Remember 'every commit carries a plan trailer'? Here's why that's true 100% of the time and not 80%."

---

## ⏱ 01:32 · Slide 4.7 — War story: the gitleaks CI failure

**Content**

- Secret scanning in CI broke: the gitleaks Action began requiring a license
- The tempting fix: delete the scanning step. Everything goes green!
- The actual fix: migrate to the free CLI — the check survived

**Notes / what to do**

- 3 min. Tell it as a temptation story — CI red, deadline pressure, and the fastest route to green is removing the guardrail.
- Generalize: "when a guardrail blocks you, that is usually the guardrail working. Understand it before you touch it." (This sentence is in the repo's CLAUDE.md about permission denials — same principle, human edition.)
- Plan file exists for this: `docs/plans/002-ci-gitleaks-cli.md` — flash it.

---

## ⏱ 01:35 · Slide 4.8 — The confidence loop

**Content**

- Before implementing: the agent self-scores its plan 1–10
- Below 8 → **stop and ask**, naming exactly what it's guessing about
- A question costs 30 seconds; a wrong guess costs an hour

**Notes / what to do**

- 3 min. Show the actual text in CLAUDE.md. Explain the design: the score itself matters less than the forced _naming_ of the guess — "a file I haven't read, an API I'm unsure of, a requirement with two readings."
- Callback to slide 1.5: this is the mechanism that prevents "mostly right."

---

## ⏱ 01:37 · Slide 4.9 — Verify before claiming

**Content**

- "It typechecks" ≠ "it works"
- `npm run verify` is the floor
- Anything touching auth: drive the real flow — `npm run smoke`

**Notes / what to do**

- 2 min. Quick slide; the smoke demo already ran in section 3, so just connect it: the rule in CLAUDE.md says don't claim success you haven't observed.
- One line for the road: "The agent's confidence is an output. Verification is evidence."

---

## ⏱ 01:38 · Slide 4.10 — The narrow remediation loop

**Content**

- Reproduce → read the actual error → smallest root-cause fix
- Re-run the _narrowest_ check first; full verify only at the end
- Never: delete the assertion, loosen the type, add `any` / `@ts-ignore`

**Notes / what to do**

- 3 min. This is the repo's `/fix` command, used in anger: a vitest 4 upgrade broke Better Auth password tests; the loop found the root cause instead of papering over it.
- Contrast with the anti-pattern: agents (and humans) under pressure re-run the whole suite after every guess — slow feedback breeds sloppy fixes.
- Break is next: "5 minutes — when we're back: how to stop re-explaining yourself. Skills."
