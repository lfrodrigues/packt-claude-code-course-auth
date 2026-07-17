# 012 — Deploy to production with Neon + Render, wire up the MCP servers

## Context

The workshop needs the app running in real production so students can see
Claude Code operate live infrastructure, not just localhost. We picked Render +
Neon because they're best in class for a stateful Express + Postgres app and
free forever — the app deploys as-is, with no serverless/edge refactor.

**Each student deploys their own instance.** Students clone this repo from
GitHub, follow the README's "Deploy to production" section, and use their own
Neon and Render accounts plus their own MCP auth (Neon OAuth, Render API
key) so the agent provisions infra under their identity, not a shared one.
This matches the per-student MCP-auth story already implied by the MCP table:
there's no shared secret to distribute or leak, and it's the same workshop
story as localhost — "this is your app, running on your infra."

Chosen stack (free tiers, verified July 2026):

- **API** — Render free web service (750 instance-hours/mo; spins down after
  15 min idle, ~30–60s cold start).
- **Database** — Neon free Postgres. Deliberately _not_ Render's free Postgres,
  which expires and is deleted 30 days after creation.
- **Frontend** — Render free static site serving the `apps/web` build.
  Originally Vercel/Cloudflare Pages, but Render-only is strictly better here:
  static sites are free with no spin-down, Render supports rewrite rules (so
  the same-origin proxy works identically), students need one fewer account,
  the Render MCP then covers the entire deployment, and one `render.yaml`
  blueprint describes both services.
- **MCP servers** — the official Neon MCP (`https://mcp.neon.tech/mcp`) and
  Render MCP (`https://mcp.render.com/mcp`), so Claude can inspect and operate
  the deployed infra from the editor. Render's MCP has no destructive actions
  (no service/DB deletion); Neon's can run SQL and migrations, so it stays
  gated by this repo's confirm-before-migrate rule.

## Approach

1. **Neon**: create project + database, get the pooled connection string.
2. **Migrations**: run `npm run db:migrate` once against the Neon URL —
   explicitly confirmed with the user before applying (WON'T rule).
3. **Render services**: created from `render.yaml` via the dashboard's
   Blueprint flow, **not** the Render MCP — see "What the Render MCP can't do"
   below. Env vars come from `sync: false` prompts, never committed:
   `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET` (Render-generated),
   `BETTER_AUTH_URL` (the _public_ origin — the static site's URL, since
   requests arrive via its `/api` rewrite), `WEB_ORIGIN` (same).
4. **Frontend**: `apps/web` as a Render static site — no build-time API URL
   needed, since `/api` is a rewrite (step 5).
5. **Same-origin in prod, like dev**: the web app assumes same-origin (no
   `baseURL` in `auth-client.ts`; dev uses the Vite proxy), and the security
   rules keep cookies `HttpOnly` + `SameSite=Lax`. So prod mirrors that: the
   static site's rewrite rule proxies `/api/*` to the API service. No
   cookie-flag changes, no web code changes; `WEB_ORIGIN` is set to the static
   site's URL. An `auth.ts` change **does** ship, but not the one originally
   prescribed: `ipAddressHeaders: ['cf-connecting-ip']`, chosen by measuring the
   live deploy. See "The client IP question" below.
6. **MCP**: add both remote MCP servers to `.mcp.json` so every student's
   Claude Code picks them up; auth is per-student (Neon OAuth, Render API
   key). The student drives the database and all _verification_ through the
   MCPs; the two Render services come from the Blueprint, because the MCP
   cannot express the rewrite (see below).
   The Render key lives in the student's shell profile (`~/.zshrc` export),
   **not** the repo's `.env` (that's app runtime config, loaded by `env.ts`,
   not by Claude Code) and not `.mcp.json` (committed; gitleaks would flag
   it). Class guidance: create the key fresh for the workshop and revoke it
   afterward — it's account-wide. Document the pre-class prerequisite:
   Neon and Render accounts created and the Render API key exported before
   the workshop.
7. **Smoke**: run the README curl walkthrough (`npm run smoke` pointed at prod)
   against the deployed API.
8. **`autoDeploy: false` + the `/deploy` skill.** Blueprints default to
   `autoDeploy: yes`, which makes `git push` a production deploy — including an
   agent's push, with `--no-verify` skipping the only gate. Off now in
   `render.yaml` and on both live services (via Render's REST API — the MCP's
   `update_web_service` takes only a `serviceId`; see below).

   `.claude/skills/deploy/SKILL.md` is the deploy path: verify (refuse if red) →
   `trigger_deploy` over the MCP → watch until live → smoke prod → read the logs
   for the client-IP warning, since smoke passes either way. No force or skip
   flag; break-glass is the dashboard's Manual Deploy. `trigger_deploy` replaced
   the original hook-URL design, so no secret hook URL is needed.

   Drafted by the agent, **installed by a human** — `.claude/` is deny-listed.
   **Not yet exercised:** `/deploy` has never been run end to end.

## What the Render MCP can't do

The plan originally had students create both services by asking Claude. Reading
the MCP's actual tool schemas before calling them killed that:

- **`create_static_site` takes no `routes` parameter** (only `name`, `repo`,
  `branch`, `buildCommand`, `publishPath`, `envVars`), and `update_static_site`
  takes nothing but a `serviceId`. So the `/api/*` rewrite — the single piece
  holding the same-origin architecture up — is unreachable from the MCP.
- **`create_web_service` env vars are literal values only**; there is no
  `generateValue`, so `BETTER_AUTH_SECRET` couldn't be Render-generated.
- **`update_web_service` / `update_static_site` take only a `serviceId`** — no
  settable fields at all. Turning `autoDeploy` off on the live services (step 8)
  had to go through Render's REST API with the same `RENDER_API_KEY`.

Hence: Blueprint creates, MCP verifies. The MCP is strong on the read side —
services, deploys, logs, metrics, env vars — which is what the
operate-from-the-editor demo actually needs. Letting it lead would have dropped
the rewrite, and the likely "fix" for the resulting broken cookies is a
cross-origin loosening: a guardrail traded away to fit a tool's gaps.

## The client IP question

Prod logged "could not determine a client IP … falling back to a single shared
per-path bucket" on every request: one attacker could exhaust the `/sign-in`
budget for everyone.

Cause, from the resolver (`@better-auth/core/src/utils/ip.ts`): it trusts a
forwarded header **only when single-valued**, else returns `null`. So
`ipAddressHeaders: ['x-forwarded-for']` — what `apps/api/CLAUDE.md` prescribed —
is both a no-op (already the default) and the cause.

Docs disagreed, so we measured the headers on the live deploy with a temporary
probe (added, read via the Render MCP, reverted — it is not in this branch's
history). On Render, through the rewrite:

- `x-forwarded-for` — **5 values**. Unusable: this is what produces the `null`.
- `cf-connecting-ip` — **single value**, real client IP, set by the Cloudflare
  edge. Forging it is 403'd at the edge.

**Fix: `ipAddressHeaders: ['cf-connecting-ip']`** — replacing the default, not
extending it. Fails safe: without the edge (dev, tests, another host) it returns
`null` and degrades to the shared bucket — throttles too much, never too little.
Never a bypass.

Worth keeping: **smoke passed 6/6 against prod while this was broken**, because
a shared bucket still 429s, just sooner. The signal was a log line, not a test.

## Files touched

- `apps/api/src/auth.ts` — `advanced.ipAddress.ipAddressHeaders:
['cf-connecting-ip']`, so rate limits key per client instead of collapsing
  into one shared bucket. Measured, not guessed — see above.
- `apps/api/CLAUDE.md` — corrected: it prescribed `x-forwarded-for`, which is
  both a no-op (already the default) and the cause of the `null`. Bad advice in
  an agent instruction file propagates to every future change, so it counts as
  part of the fix.
- `.mcp.json` — Neon + Render remote MCP entries.
- `render.yaml` (new) — blueprint defining both services: the `apps/api` web
  service and the `apps/web` static site with its `/api/*` rewrite rule,
  keeping prod same-origin like dev.
- `render.yaml` — `autoDeploy: false` on both services, so `git push` no longer
  ships to prod (see approach 8).
- `.claude/skills/deploy/SKILL.md` (new) — the gated `/deploy` path. Drafted by
  the agent, **placed by a human**: `.claude/` is deny-listed, so the agent
  cannot install its own gate. Not yet exercised.
- `README.md` — deploy steps and student prerequisites. **`SLIDES/` not yet
  updated** — the deploy segment and pre-class prerequisites are outstanding.

## Verification

Done, in this order — each step's result is recorded above:

- ✅ `npm run verify` — green (24 tests). The `auth.ts` change is config, so the
  suite can't prove it; see the caveat below.
- ✅ Neon schema migrated and **verified via the Neon MCP** that the tables
  landed on Neon, not the local dev DB — `drizzle.config.ts` loads the repo
  `.env`, so "it said success" was not sufficient evidence of _where_.
- ✅ `npm run smoke` against the deployed static-site URL — 6/6, through the
  rewrite proxy, against real Neon Postgres.
- ✅ `/api/me` through the static site returns 401, not 404 — proving the
  rewrite proxies rather than falling through to the SPA.
- ✅ Client IP measured via a temporary probe + the Render MCP, and the fix
  chosen from the result.
- ✅ Fix verified in prod via `/deploy` (deploy `dep-d9d20vurnols73cmn150`).
  Sign-up and sign-in both hit with
  `cf-connecting-ip: 94.201.105.103` present, and **no "could not determine a
  client IP" warning** — it had fired on every request before. Checked that the
  auth traffic was actually in the log window first: an absent warning proves
  nothing if nothing hit the rate-limited endpoints.
- ✅ `/deploy` exercised end to end, first run: clean-tree check → verify (24
  passed) → `trigger_deploy` → watched to `live` → smoke 6/6 → log check.

## Confidence

9/10, up from 8. Live, auth passing end-to-end in prod, and the fix confirmed by
its warning going silent — the one question the docs couldn't settle, answered
from evidence.

The remaining 1: **no test guards this fix.** If a future deploy drops the
Cloudflare edge, rate limiting silently collapses back to a shared bucket and
every test still passes. The only signal is a log line — which is why `/deploy`
step 6 checks it on every deploy.
