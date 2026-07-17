# Section 2 — The Orchestration Mindset (0:15–0:40)

---

## ⏱ 00:15 · Slide 2.1 — Claude Code is the engineer, not the feature

**Content**

- Not: bolting AI onto a product
- But: onboarding an engineer who reads everything and forgets everything between sessions
- Your job shifts: less typing code, more designing the environment it works in

**Notes / what to do**

- 2 min. The "brilliant amnesiac engineer" framing carries the whole section — a colleague who reads the entire repo instantly but wakes up every morning with no memory of yesterday.
- Ask: "What would you write down for that colleague? Where would you put it?" — that's CLAUDE.md, plans, and hooks in one question.

---

## ⏱ 00:18 · Slide 2.2 — Plan before build

**Content**

- Every meaningful change gets a committed plan: `docs/plans/NNN-slug.md`
- Every implementing commit carries a trailer: `Plan: docs/plans/001-auth-login.md`
- `git log --grep='^Plan:'` reconstructs the reasoning behind the whole history

**Notes / what to do**

- 2 min. Explain why the plan is _committed_, not chatted: chat evaporates, the repo persists — this is how you defeat the amnesia from the previous slide.
- Stress that the trailer is _enforced_ by a commit-msg hook (preview of section 4), not a convention people politely ignore.

---

## ⏱ 00:21 · Slide 2.3 — 🎬 DEMO: the history tells the story

**Content**

- `git log --oneline --grep='^Plan:'`
- Every commit in this repo traces to a plan file
- This repo itself was built this way, session one onward

**Notes / what to do**

- 3 min live. Run `git log --grep='^Plan:' --oneline` in auth-app; scroll it.
- Then open one plan file (e.g. `docs/plans/001-auth-login.md`) and show Context / Approach / Verification.
- War story: "This isn't a fixture — this is the actual history of me and Claude Code building the app you'll see today. When I came back the next day and asked 'why is CORS configured like this?', the agent answered from the plan, not from a guess."
- Fallback if terminal misbehaves: screenshot of the log output as a backup slide.

---

## ⏱ 00:25 · Slide 2.4 — CLAUDE.md as the system contract (the "Constitution")

**Content**

- Boundaries, expectations, engineering intent — in the repo, loaded every session
- This repo: one CLAUDE.md at the root — the single source of truth
- Nested CLAUDE.md per workspace: rules scoped to where they apply

**Notes / what to do**

- 3 min. Open the root `CLAUDE.md` and walk its structure: what this is → commands → layout → rules (WON'Ts, confidence loop) → enforcement. It reads like an onboarding doc, because that's what it is.
- Mention nested CLAUDE.md files in apps/api, apps/web, packages/shared load automatically when the agent touches those dirs.

---

## ⏱ 00:29 · Slide 2.5 — Advisory vs enforced: the core principle

**Content**

- CLAUDE.md is advisory — nothing stops an agent ignoring it
- The things that matter are enforced where the agent can't reach: permissions, git hooks, secret scanning, CI, CODEOWNERS
- **"Anything an agent could disable, enforce somewhere the agent isn't."**

**Notes / what to do**

- 3 min. This is the single most important principle of the workshop — it's literally written in CLAUDE.md's enforcement section; show it there.
- Draw the two-layer picture: soft layer shapes behavior (cheap, flexible), hard layer catches violations (deterministic, non-negotiable). You need both; people usually build only the soft one.

---

## ⏱ 00:32 · Slide 2.6 — Prompt vs scaffold vs skill vs tool

**Content**

- Prompt: per-turn — "do this now"
- Scaffold: per-repo — "this is what good looks like here"
- Skill: per-task-type — "this is how we always do X"
- Tool (MCP): per-capability — "this is what you can reach"
- Rule of thumb: if you've typed the same instruction 3 times, it belongs one level up

**Notes / what to do**

- 3 min. Give one concrete example moving up the ladder: "make the error responses consistent" → prompt (once) → convention in CLAUDE.md (repo) → api-route skill (every route, every project) → wired to Sentry MCP (observed in prod).
- The "3 times" heuristic is the practical takeaway — say it twice.

---

## ⏱ 00:35 · Slide 2.7 — War story: evaluating outside advice

**Content**

- A friend's review suggested adding `customCommands` to settings.json — that feature doesn't exist
- A Gemini review: one real find (broken package exports), one already-handled
- The loop: vet → verify against docs/reality → then apply

**Notes / what to do**

- 3 min. Tell it with affection, not mockery — the point is that _plausible_ advice (human or AI) fails the same way plausible code does.
- The real find from Gemini's review is a nice honest counterweight: outside review does catch things (the shared package exported raw .ts that Node couldn't run; the no-floating-promises rule was 'off' with a comment claiming otherwise).
- Punchline: "You are the senior engineer in the loop. The workshop gives your agent judgment-shaped guardrails, but the judgment is still yours."

---

## ⏱ 00:38 · Slide 2.8 — Memory across sessions

**Content**

- Persists: CLAUDE.md, plan files, code, git history, memory files
- Evaporates: the conversation
- Design for amnesia: anything worth remembering goes in the repo

**Notes / what to do**

- 2 min. Close the loop with slide 2.1's amnesiac engineer: you've now seen every mechanism that stands in for memory.
- Practical tip: if you catch yourself re-explaining something in a second session, stop — put it in CLAUDE.md or a plan instead.
- Transition: "So what does the repo itself need to look like? Break out the scaffold."
