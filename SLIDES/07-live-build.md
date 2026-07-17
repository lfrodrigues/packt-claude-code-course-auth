# Section 7 — The Orchestrator in Action: Live Build (2:25–3:00)

> Live-build project still TBD (ticket-triage app vs feature-on-auth-app vs PR
> review agent). Slides 7.2–7.4 are project-agnostic scaffolding; they get
> rewritten with concrete steps once the project is chosen.

---

## ⏱ 02:25 · Slide 7.1 — The setup

**Content**

- We start from a _feature spec_, not a prompt
- Everything from the last 2.5 hours is now on: scaffold + guardrails + skills + MCP
- Watch for: which layer is doing the work at each moment

**Notes / what to do**

- 2 min. Put the feature spec on screen — short, written, unambiguous. The spec-not-prompt distinction matters: specs are reviewable before any code exists.
- Give the audience a watching brief: "call out when you see a guardrail fire."

---

## ⏱ 02:27 · Slide 7.2 — 🎬 DEMO: the full loop, one feature end to end

**Content**

- `/plan` → schema → API route → UI → test → review → ship (→ deploy)
- Live, no edits-off-camera

**Notes / what to do**

- ~20 min live. This is the centerpiece; the slide is just a backdrop.
- Narrate at layer level, not keystroke level: "the skill is driving… the shared package just forced the type through to the UI… verify is the gate before the commit."
- Run-sheet (to be written once project is chosen) needs: exact spec text, expected timings per stage, pre-warmed environment, and a mid-point save state you can jump to if a stage stalls.
- Timebox each stage; if one overruns, jump to the save state rather than debugging live beyond ~2 minutes.

---

## ⏱ 02:42 · Slide 7.3 — The moment a guardrail catches something

**Content**

- A deny rule / failing verify / confidence-loop stop — live
- This one moment is the whole thesis: bad output _caught_, not shipped

**Notes / what to do**

- Can be engineered (spec deliberately brushes against a protected file) or organic — have the engineered version ready, use the organic one if it happens first.
- Freeze the moment when it fires: stop typing, face the room, replay what just happened and which layer caught it. This is the image you want them to leave with.

---

## ⏱ 02:45 · Slide 7.4 — What just happened: recap over the diff

**Content**

- The final diff + the plan file + the commit trailer, side by side
- Reconstructable reasoning · enforced gates · zero improvisation
- Nothing here required trusting the agent — every claim was checked

**Notes / what to do**

- 3 min. Walk the artifacts calmly after the demo adrenaline: here's the plan, here's the code, here's the trailer binding them, here's the green verify.
- Land the reversal: "at no point did I ask 'do I trust it?' — the system answered that at every step."

---

## ⏱ 02:48 · Slide 7.5 — The take-home: GitHub PR review agent

**Content**

- Connect a repo → Claude reviews a PR → flags bugs → posts review comments
- Uses: GitHub MCP, a review skill, your own constitution
- Deliberately the stage-risky project — perfect at home, wrong for a stage

**Notes / what to do**

- 2 min. Hand out the spec (link/QR). Be explicit about why it's homework and not the live build: live GitHub auth + rate limits fail on stage; at their own desk it's ideal.
- Point them at this repo's `/pr` command as a starting seed to grow from.

---

## ⏱ 02:50 · Slide 7.6 — Takeaways

**Content**

- Two repos: the auth-app scaffold (fork it) + the app we just built live · the skills (copy them) · the constitution (adapt it)
- "Anything an agent could disable, enforce somewhere the agent isn't."
- Vibe coding gets you a demo. This gets you something you can ship.

**Notes / what to do**

- 2 min. Close the loop on slide 1.1's thesis, now earned rather than asserted.
- "Fork the scaffold this week or you won't do it" — give them the honest nudge.

---

## ⏱ 02:52 · Slide 7.7 — Q&A

**Content**

- Questions
- Repo link + contact

**Notes / what to do**

- ⚠️ TODO: ask Packt whether there's a QA session

- ~10 min buffer. Keep the repo link on screen the whole time.
- Prepare for the two questions that always come: "what does this cost to run?" and "how do I sell this workflow to my team?" — have crisp answers ready.
