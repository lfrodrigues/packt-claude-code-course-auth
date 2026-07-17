# Section 1 — Why Claude Code Fails in Real Projects (0:00–0:15)

---

## ⏱ 00:00 · Slide 1.1 — Title / welcome

**Content**

- Orchestrating Production-Grade Web Apps with Claude Code
- Your name / one-line bio
- "Vibe coding gets you a demo. Engineering judgment plus the right scaffold gets you something you can ship and maintain."

**Notes / what to do**

- 1 min. Welcome, who you are, one sentence on why you built this workshop.
- Read the thesis line aloud, slowly — it's the sentence the whole 3 hours hangs on. Tell them you'll come back to it at the end.
- Logistics: 3 hours, one break at 1:40, questions welcome throughout.

---

## ⏱ 00:01 · Slide 1.2 — 5-minute primer: what Claude Code actually is

**Content**

- A terminal agent, not a chat window
- Reads your repo, edits files, runs commands, loops until done
- You review diffs and grant permissions — it acts, you govern
- Session = conversation + full repo context

**Notes / what to do**

- 4–5 min, for the beginners; keep the experienced people engaged by framing it as "the mental model that matters, not the tutorial."
- Optional micro-demo: open a terminal, run `claude`, ask it something trivial about the repo ("what does npm run verify do?") so beginners see the shape of a session.
- Key line: "It's an engineer you're onboarding, not autocomplete." Everything later builds on this.

---

## ⏱ 00:05 · Slide 1.3 — The demo trap

**Content**

- Vibe coding works when: greenfield, no conventions, nobody maintains it
- Production inverts all three
- The demo isn't lying — it's answering a different question

**Notes / what to do**

- 2 min. Acknowledge the genuine magic of the first demo experience — don't be the cynic; be the person explaining why it doesn't transfer.
- Story beat: "Every impressive demo you've seen shares three properties…" then flip each one to the production reality.

---

## ⏱ 00:07 · Slide 1.4 — The failure modes you've already felt

**Content**

- Context drift — it forgets the decision from an hour ago
- Inconsistent patterns — the fourth component looks nothing like the first three
- Weak tests — assertions that can't fail
- Risky edits — touching the migration, the .env, the auth check
- Plausible-but-unshippable code

**Notes / what to do**

- 2–3 min. Ask for a show of hands per failure mode — "who's had the agent invent a second way of doing something you already had a pattern for?" This is the audience-bonding moment.
- Don't solve anything yet. Let the pain sit; the whole workshop is the answer.

---

## ⏱ 00:09 · Slide 1.5 — "Mostly right" is the most expensive kind of wrong

**Content**

- Obviously wrong: costs 30 seconds
- 90% right: costs hours — you debug code that _looks_ correct
- The goal isn't more output; it's output you don't have to distrust

**Notes / what to do**

- 2 min. This is the economic argument for everything that follows — land it hard.
- Real hook: "I'd rather the agent stop and ask than ship an assumption. Later you'll see the actual mechanism that makes it do that." (Teases the confidence loop in section 4.)

---

## ⏱ 00:11 · Slide 1.6 — It's rarely the model alone

**Content**

- Same model, two repos: production-grade code vs slop
- The variable is the environment: context, conventions, gates
- You can't fix the model. You can fix the repo.

**Notes / what to do**

- 1–2 min. Preempt the "the model is just bad" objection.
- "You can't fix the model, you can fix the repo" is a tweetable line — pause on it.

---

## ⏱ 00:12 · Slide 1.7 — The missing layer: orchestration

**Content**

- Context (CLAUDE.md, plans) → what it knows
- Scaffold (repo shape, types, tests) → what good looks like
- Guardrails (permissions, hooks, gates) → what it can't break
- Skills (encoded procedures) → how your team does things
- MCP (external tools) → what it can reach
- ⌚ This is the map of the next 3 hours

**Notes / what to do**

- 2 min. This slide IS the workshop's table of contents — point at each layer and name the section that covers it.
- Tell them: "if you remember one slide, remember this one."

---

## ⏱ 00:14 · Slide 1.8 — What you leave with

**Content**

- The forkable scaffold (this repo — link/QR)
- The second app, built live in front of you, end to end with guardrails on
- A set of skills + a project constitution to copy

**Notes / what to do**

- 1 min. Share the repo URL / QR now so people can clone during the workshop.
- Transition line into section 2: "Everything starts with a mindset shift, so that's where we go first."
