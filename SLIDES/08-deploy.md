# Section 8 — Deploy It Yourself (OPTIONAL · ~10 min)

> **Droppable module.** Nothing else depends on it. Run it if the live build
> finishes early or a demo stalls. Cut it whole, never half.
>
> This section mirrors the README's "Deploy to production" walkthrough
> step-for-step, so the room can follow along or replay it at home. Everything
> in a `Say to Claude:` block is copy-paste. Everything in a shell block is
> typed.
>
> **Only 4 minutes? Run 8.5 alone** — it needs no setup and it's the payload.
>
> ⚠️ Before the session: have a Neon + Render account, `RENDER_API_KEY`
> exported, and a fork already cloned. Do **not** do prerequisites on stage.

---

## ⏱ +00:00 · Slide 8.1 — The shape

**Content**

- Static site serves the SPA · rewrites `/api/*` → the API service
- Prod is **same-origin** — exactly like the Vite proxy in dev
- So: no cookie changes, no CORS loosening, no code changes
- Render (API + site) · Neon (Postgres) · both free

**Notes / what to do**

- 1 min. One idea: **same-origin in prod mirrors same-origin in dev**; everything else follows.
- The alternative is cross-origin cookies, which is where people reach for `SameSite=None` and widen CORS — loosening a guardrail to fix a config problem. The rewrite means that temptation never appears.
- Don't sell Render. The vendors are swappable; the shape isn't.

---

## ⏱ +00:01 · Slide 8.2 — Setup: the key goes in your shell, not the repo

**Content**

```bash
# ~/.zshrc — then restart Claude Code
export RENDER_API_KEY="rnd_..."
```

- **Not** `.env` (that's the app's config — Claude Code never reads it)
- **Not** `.mcp.json` (it's committed — gitleaks would catch you)
- Neon: `/mcp` → authorize via OAuth

**Notes / what to do**

- 1 min. `.mcp.json` expands `${RENDER_API_KEY}` from the environment of the shell that launched Claude Code — so the export has to be in the profile, and you must restart after adding it.
- The key is account-wide: create it fresh for the workshop, revoke it after. Say this out loud; someone will copy your habits.

---

## ⏱ +00:02 · Slide 8.3 — Database, and _where_ did it migrate?

**Content**

> **Say to Claude:**
> _"Create a Neon project and give me the pooled connection string."_

```bash
DATABASE_URL='<your-neon-pooled-url>' npm run db:migrate
```

> **Say to Claude:**
> _"List the tables in my Neon database."_

**Notes / what to do**

- 2 min. Claude **asks before migrating** — that's the WON'T rule firing. Point at it when it happens; it's a guardrail the room can see.
- The last step is the one worth teaching: `drizzle.config.ts` loads the repo's `.env`, so "migrations applied successfully" does **not** tell you _which_ database you hit. It said success to me too — I checked Neon before believing it.
- **Verify where, not just whether.** That habit generalises past this repo.

---

## ⏱ +00:04 · Slide 8.4 — Create, then close the URL loop

**Content**

- Dashboard → **New → Blueprint** → your fork → your branch
- Paste `DATABASE_URL` · let it generate `BETTER_AUTH_SECRET`

> **Say to Claude:**
> _"List my Render services and tell me both URLs."_
>
> _"Set BETTER_AUTH_URL and WEB_ORIGIN on my API service to my static site's URL."_

- Then edit `render.yaml`'s rewrite `destination` → your real API URL → push

**Notes / what to do**

- 2 min. Two things bite everyone, so name both:
  - **Names are globally unique.** `auth-app-api` → `auth-app-api-lwrx`. Yours differ from the slides. Hence "ask Claude for the URLs" rather than printing them.
  - **Both env vars are the _static site's_ URL**, not the API's. Browsers reach the API _through_ the rewrite, so the site is the public origin — what cookies are signed for. Until they're set the API won't boot: `env.ts` refuses to start half-configured. That's the guardrail, not a crash.
- The rewrite is the one thing the MCP **can't** do — no `routes` param — so it ships through git. Config stays reviewable.

---

## ⏱ +00:06 · Slide 8.5 — 🎬 6/6 green, security broken

**Content**

```bash
API=https://<your-site>.onrender.com npm run smoke
```

- `Smoke passed: 6/6 checks green.`

> **Say to Claude:**
> _"Check my API logs for the better-auth client IP warning."_

- **No test could see it. A log line could.**

**Notes / what to do**

- 3 min. **This is the slide.** Slow down.
- Beat 1 — the trap: 6/6 green, real auth, real Postgres. Ask the room: **"ship it?"** Let them say yes.
- Beat 2 — the reveal: read it verbatim — _"Rate limiting could not determine a client IP — falling back to a single shared per-path bucket."_ Every request. Then the consequence in user terms: **one attacker can lock every user out of sign-in.**
- Beat 3 — the kicker: the suite passed **before and after the fix**. A shared bucket still returns a 429, it just trips sooner. Not "we forgot a test" — **no test can tell these apart.** Callback to 1.1: a green suite can't tell you the password was hashed.
- Beat 4 (if time): three sources, three answers — including an LLM search summary citing a Render _bug report_ as if it were docs. So we measured on the live deploy instead of guessing: `cf-connecting-ip`. Confirmed by watching the warning go silent.
- Depth if asked: `docs/plans/012-prod-deploy-and-mcp.md`.

---

## ⏱ +00:09 · Slide 8.6 — Push is not a deploy

**Content**

- Blueprints default to auto-deploy → **`git push` ships to prod**
- Any agent that can push can ship. `--no-verify` skips the gate
- So: auto-deploy **off**. `/deploy` = verify → deploy → smoke → **read the logs**
- The agent wrote that skill. It couldn't install it — `.claude/` is deny-listed

**Notes / what to do**

- 1 min. Land the last bullet: **the agent drafted its own gate and a human had to install it.** "Anything an agent could disable, enforce somewhere the agent isn't" — executed, not asserted.
- `/deploy` step 6 is 8.5's log check: the lesson became a permanent gate, not a war story.
- Out: "That's production. Same loop, pointed at a machine you don't own."
