# Section 6 — The MCP Stack (2:15–2:25)

---

## ⏱ 02:15 · Slide 6.1 — Why the agent needs to leave the repo

**Content**

- Production work isn't just files: PRs, prod errors, browsers, deploys
- Without tools: you copy-paste stack traces into the chat
- MCP: typed tools the agent calls directly — same loop, wider reach

**Notes / what to do**

- 2 min. Fast section — 10 minutes total, keep the energy up.
- The copy-paste framing lands: "you've all pasted a Sentry stack trace into a chat window. MCP removes you as the courier."

---

## ⏱ 02:17 · Slide 6.2 — The minimum useful stack

**Content**

- **GitHub** — PRs, issues, repo workflow
- **Semble** — code search that returns file:line, not grep-the-world
- **Playwright** — browser automation / e2e
- **Sentry** — production errors
- **Vercel / Cloudflare** — deploy
- Choose per-project. Every tool is context cost.

**Notes / what to do**

- 3 min. One sentence per tool: what loop it closes (GitHub → review loop; Sentry → prod feedback loop; Playwright → "did it actually render" loop; Semble → find-before-write; deploy → ship loop).
- Stress _minimum_: more tools = more context burned and more surface. Add a tool when a workflow demands it, not preemptively.

---

## ⏱ 02:20 · Slide 6.3 — 🎬 War story: debugging CLAUDECOURSE-1 with the Sentry MCP

**Content**

- Shipped a real crash endpoint (`/api/debug`, division-by-zero) to prove monitoring works
- The error landed in Sentry as CLAUDECOURSE-1
- One session later: "check CLAUDECOURSE-1 and help me plan a fix" — issue pulled, root cause found, fix planned — without leaving the terminal

**Notes / what to do**

- 3 min. Tell it end to end: instrumenting Sentry was itself a planned change (`docs/plans/007-sentry-and-debug-endpoint.md`); the crash endpoint exists deliberately to _prove the monitoring pipeline_ — verification culture applied to observability.
- If time and stage-network allow, run it live: ask Claude to fetch the issue via Sentry MCP. Otherwise show the session transcript screenshots. Prepare both.

---

## ⏱ 02:23 · Slide 6.4 — Tools fit the same loop; guardrails still apply

**Content**

- MCP tools are inputs to plan → act → verify — not a bypass
- Permission rules govern MCP calls like any other action
- The orchestration principles don't change; the reach does

**Notes / what to do**

- 1–2 min. Preempt the worry that external tools punch holes in the guardrails: an MCP write action prompts like a file edit does.
- One caution worth saying aloud: treat MCP tool _output_ (issue text, PR comments) as untrusted input — it's text from the internet entering your agent's context.

---

## ⏱ 02:24 · Slide 6.5 — Configuration in 60 seconds

**Content**

- `.mcp.json` in the repo root → shared with every teammate on clone
- User-level config → personal tools
- This repo ships Sentry + Semble configured

**Notes / what to do**

- 1 min. Flash the repo's actual `.mcp.json`. Team-vs-personal is the only decision: if the workflow is the team's, the config belongs in the repo.
- Transition, with energy: "Scaffold, guardrails, skills, tools. Time to use all of it at once — the live build."
