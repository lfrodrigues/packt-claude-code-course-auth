# Section 3 — The Production Scaffold (0:40–1:15)

---

## ⏱ 00:40 · Slide 3.1 — The repo shape Claude Code thrives in

**Content**

- Folder conventions the agent can infer from one example
- Strict typing — the compiler argues so you don't have to
- Clear boundaries — one obvious place for everything
- Lint + format + tests wired to a single command
- Principle: make the good output the path of least resistance

**Notes / what to do**

- 3 min. Framing: the scaffold isn't for the agent's benefit alone — it's the same repo a senior human thrives in. "Everything that makes an agent effective makes a new hire effective."
- Set up the next slide: "Let's look at the actual repo."

---

## ⏱ 00:44 · Slide 3.2 — 🎬 DEMO: tour of auth-app

**Content**

- `apps/api` — Express + Better Auth (the security boundary)
- `apps/web` — Vite + React 19 SPA
- `packages/shared` — zod schemas both sides import
- `docs/plans/` — the reasoning
- Built with Claude Code, plans-first, over ~2 days

**Notes / what to do**

- 5 min live. Screen-share the file tree; walk each workspace top-down, one sentence each.
- Point out `auth.ts` ("the security boundary — you'll see it's specially guarded in section 4") and `app.ts` as a factory ("so tests build the app without a port — agent-runnable tests").
- Keep moving; resist rabbit holes. The deep dives come on the next slides.

---

## ⏱ 00:50 · Slide 3.3 — The contract package

**Content**

- `packages/shared`: zod schemas = runtime validation + static types, one definition
- API and web both import it — the agent _can't_ drift client and server apart
- A boundary the type checker enforces is a boundary the agent respects

**Notes / what to do**

- 3 min. Open one schema and show the same import line in an API route and a React component.
- Key insight: you're not trusting the agent to keep two definitions in sync — you removed the possibility of two definitions. Structural guardrails beat instructions.

---

## ⏱ 00:54 · Slide 3.4 — One command that means "green"

**Content**

- `npm run verify` = typecheck + lint + format + test + knip + audit
- One definition of done — shared by you, the agent, the pre-push hook, and CI
- `verify:full` adds Playwright e2e + Semgrep = "green in CI"

**Notes / what to do**

- 3 min. This is in CLAUDE.md's command table — show it.
- Why it matters for agents: "done" becomes checkable, not vibes. The agent runs verify before claiming success; the hook runs it before commit; CI runs it again. Same command, three enforcement points.
- Common failure it prevents: agent says "all tests pass" having run only the one test file it wrote.

---

## ⏱ 00:57 · Slide 3.5 — Strict typing as guardrail, not ceremony

**Content**

- TS strict mode + type-aware ESLint
- War story: `no-floating-promises` was `'off'` — directly under a comment saying rejections must not be swallowed
- The comment lied; the rule now tells the truth

**Notes / what to do**

- 3 min. Tell the story: an external review caught that the eslint config _said_ "auth code must not silently swallow rejections" while the enforcing rule was disabled. Classic advisory-vs-enforced in miniature.
- In auth code a floating promise is a real bug class (unawaited session write → race). Enabling the rule surfaced actual code to fix.
- Moral: every place a comment expresses intent, ask "what enforces this?"

---

## ⏱ 01:01 · Slide 3.6 — 🎬 DEMO: the login flow, for real

**Content**

- `npm run dev` → signup → session → sign-out → sign-in
- `npm run smoke`: the same walkthrough as a script that fails loudly
- Deliberately bash + curl, not TypeScript
- If it isn't driven, it isn't verified

**Notes / what to do**

- 5 min live. Boot the app (have Postgres already up: `docker compose up -d` _before the workshop_). Do the flow once in the browser, fast.
- Then run `npm run smoke` and show the same flow as green terminal output — this is what the agent runs to prove auth still works.
- Why bash+curl and not TypeScript (worth 30s aloud — it's a design decision):
  - **Same commands as the README, near-verbatim** — it proves "the thing we tell users to type works." A fetch() rewrite would test the flow but sever that link to the walkthrough.
  - **Zero-dependency proof** — no npm install, no tsx, no compilation; runs against a staging box from any machine. A smoke test should depend on as little of your own toolchain as possible, because it's what you reach for when questioning whether the toolchain-built thing works.
  - **An independent witness** — TypeScript importing your app code or schemas could be wrong in the same way the app is. Bash+curl can't share code with the system under test.
- Fallback: pre-recorded 60s screen capture if the live boot fails.

---

## ⏱ 01:07 · Slide 3.7 — Tests the agent can run

**Content**

- `app.ts` factory → tests build the app, no port, no flakes
- Real Postgres in docker — auth is never mocked
- Tests assert behavior: "rejects wrong password AND issues no session cookie"

**Notes / what to do**

- 3 min. Show one real test name from `apps/api/tests/auth-flow.test.ts` — the AND matters: it checks the security property, not just the status code.
- Tie back to WON'T rules (coming in section 4): "WON'T weaken an auth check to make a test pass" only means something because the tests actually check auth.

---

## ⏱ 01:10 · Slide 3.8 — War story: the dependency-bump gauntlet

**Content**

- One session: React 18→19, vitest 3→4, TS 5→7, dotenv, pino, +13 dev deps
- Method: bump → `npm run verify` → fix → repeat until green
- The plan: `docs/plans/004-dependency-upgrades.md`
- The gate is what made a bulk upgrade safe to _delegate_

**Notes / what to do**

- 3 min. This came from a stack of Dependabot PRs handled in one Claude Code session. Emphasize what you did NOT do: review each upgrade's changelog by hand. The verify gate + real tests substituted for that labor.
- Show the plan file (`docs/plans/004-dependency-upgrades.md`) and the commits behind it: the upgrades landed as _multiple_ commits under one plan — grouped by risk (low-risk dev-dep batch first, then the riskier majors), each one verified green before the next. One plan ≠ one commit; the plan is the unit of reasoning, the commit is the unit of safety.
- Also worth saying: the starting versions were simply whatever Opus picked when it first scaffolded the repo — the scaffold session froze that day's defaults, and this session is what real maintenance on top of them looks like.
- Honest caveat: this works because the test suite is trustworthy. Weak tests + bulk upgrades = the "mostly right" trap from section 1.

---

## ⏱ 01:13 · Slide 3.9 — Nested instructions: rules scoped to where they apply

**Content**

- `apps/api`, `apps/web`, `packages/shared` each carry their own CLAUDE.md
- They load automatically when the agent reads a file in that directory
- Global contract + local bylaws

**Notes / what to do**

- 2 min. Quick show of one nested file. Analogy: the constitution vs municipal law.
- Transition to break-adjacent energy: "So the repo makes good output likely. Now: what makes bad output _impossible_? Guardrails."
