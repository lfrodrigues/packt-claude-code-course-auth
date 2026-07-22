# auth-app

A production-shaped TypeScript repo with a real email/password login — built as a
reference for **how to structure a codebase that AI coding agents work well in**,
and **how to make their output safe to trust.**

The login is the vehicle, not the point. Auth was chosen because it has real risk
surface (password hashing, session cookies, rate limiting), so the guardrails have
something meaningful to protect — and so "the tests are green" is visibly not the
same thing as "this is correct."

**Stack:** Express 5 · React 19 (Vite) · Postgres 16 · Drizzle · Better Auth ·
Vitest · Playwright

---

## Quickstart

### Prerequisites

| Tool                | Why                                                      | Install                                      |
| ------------------- | -------------------------------------------------------- | -------------------------------------------- |
| Node (see `.nvmrc`) | Everything                                               | `nvm install`                                |
| Docker              | Postgres (dev + test databases)                          | https://docs.docker.com/get-docker/          |
| gitleaks            | Pre-commit secret scan — **silently skipped if missing** | `brew install gitleaks`                      |
| Python 3 + pipx     | Runs Semgrep in `verify:full` (same rulesets CI uses)    | `brew install pipx`                          |
| Playwright browsers | `npm run e2e`                                            | `npx playwright install chromium` (one-time) |
| uv                  | The `semble` MCP server (optional, advisory)             | `brew install uv`                            |
| `gh` CLI            | The `/pr` command (optional)                             | `brew install gh`                            |

```bash
cp .env.example .env      # dev defaults work as-is
docker compose up -d      # postgres, with a separate test database
npm install
npm run db:migrate        # create the auth tables
npm run dev               # API :3005 · web :5173
```

Open http://localhost:5173, create an account, and you're signed in.

> **Password must be at least 12 characters.** Sign-up rejects anything shorter.

## Scripts

| Command                 | What it does                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run dev`           | API + web, together                                                                            |
| `npm run verify`        | **typecheck + lint + format + test + deps:sync + knip + audit** — the fast definition of green |
| `npm run verify:full`   | `verify` + coverage + Playwright e2e + Semgrep — exactly what CI runs                          |
| `npm test`              | Unit/integration (API hits a real test database)                                               |
| `npm run test:coverage` | Same tests with coverage; fails under the thresholds in `vitest.config.ts`                     |
| `npm run e2e`           | Playwright, real browser, full login flow                                                      |
| `npm run smoke`         | The curl walkthrough below, scripted, against a running server                                 |
| `npm run db:migrate`    | Apply migrations                                                                               |
| `npm run db:generate`   | Drizzle schema → SQL migration                                                                 |

`verify` is what the pre-push hook runs; `verify:full` is what CI runs. One
definition of green, no drift. (Semgrep fetches its rulesets from the registry,
so that step needs network; pipx caches the tool itself after the first run.)

---

## Test the API with curl

The whole trick is the **cookie jar**. Sessions are cookie-based, so `-c` (save)
and `-b` (send) are what make these calls work.

```bash
API=http://localhost:3005
```

**1. Sign up** — writes the session cookie to `jar.txt`:

```bash
curl -i -c jar.txt -X POST $API/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"correct-horse-battery","name":"Ada"}'
```

**2. The protected route, with no cookie → `401`:**

```bash
curl -i $API/api/me
```

**3. The same route, with the cookie → `200` and your user:**

```bash
curl -i -b jar.txt $API/api/me
```

**4. Sign out, then confirm the cookie is dead:**

```bash
curl -i -b jar.txt -c jar.txt -X POST $API/api/auth/sign-out \
  -H 'Origin: http://localhost:5173'
curl -i -b jar.txt $API/api/me     # → 401 again
```

> Without the `Origin` header, sign-out returns **403** — that's Better Auth's
> CSRF protection. State-changing, cookie-authenticated requests must come from a
> trusted origin. Browsers send `Origin` automatically; curl doesn't, so you add
> it by hand. If you hit a 403 here, you're seeing a guardrail, not a bug.

**5. Sign back in:**

```bash
curl -i -c jar.txt -X POST $API/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"correct-horse-battery"}'
```

**6. Trip the rate limiter** — the budget is 5 sign-in attempts per minute, and
your successful sign-in in step 5 already used one, so the 429 arrives on the
fifth bad attempt here:

```bash
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "attempt $i → %{http_code}\n" \
    -X POST $API/api/auth/sign-in/email \
    -H 'Content-Type: application/json' \
    -d '{"email":"ada@example.com","password":"wrong"}'
done
```

> Better Auth **disables rate limiting in development by default.** This repo turns
> it back on deliberately, which is why step 6 works. Leaving the default in place
> would ship a login endpoint with no brute-force protection, and every test would
> still have been green.

**7. Confirm the password is actually hashed.** Nothing in the test suite tells you
this by watching the API — you have to look at the disk:

```bash
docker compose exec db psql -U auth -d auth_app \
  -c 'SELECT user_id, left(password, 24) AS stored FROM account;'
```

You should see a scrypt hash, never `correct-horse-battery`. This is the single
most useful thing in this README: a green test suite cannot tell you whether the
password was hashed, and a "mostly right" implementation that stores plaintext
passes every other check in this repo.

---

## How it's put together

```
apps/api          Express 5. auth.ts is the security boundary; app.ts is a factory
                  so tests build the app without binding a port.
apps/web          Vite + React SPA. Dev proxies /api → :3005, so it's same-origin
                  and session cookies just work.
packages/shared   zod schemas imported by BOTH sides. The contract.
e2e/              Playwright: the only test that proves the pieces fit together.
docs/plans/       The plan behind every change (see below).
```

**`packages/shared` is the point of the layout.** One schema validates the browser
form _and_ the server payload, so a renamed field is a compile error rather than a
400 someone finds in production.

### Two traps this repo is deliberately built around

**Middleware order.** The Better Auth handler mounts _before_ `express.json()`. Put
`json()` first and every auth request hangs on "pending" forever — no error, no
stack trace. And Express 5 needs `"/api/auth/*splat"`; the Express 4 `"*"` throws at
boot.

**The schema is generated.** `apps/api/src/db/schema.ts` comes from the Better Auth
CLI. Change `auth.ts`, then regenerate → generate a migration → apply it:

```bash
npm run db:auth-schema && npm run db:generate && npm run db:migrate
```

Skip the last two and you get correct _types_ over an empty _database_ — a passing
typecheck on an app that cannot work.

---

## The guardrails

The interesting half. Some of these are advice; the rest are mechanisms. **Knowing
which is which is the whole skill.**

| Guardrail               | Kind                      | What it does                                                                                               |
| ----------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`             | **Advisory**              | WON'T rules + the confidence loop. Shapes behavior; guarantees nothing.                                    |
| `.claude/settings.json` | **Enforced**              | Blocks edits to `.env`, `.husky/`, CI, `.claude/`, generated schema. Asks before `auth.ts` and migrations. |
| `.husky/pre-commit`     | **Enforced**              | gitleaks + lint + typecheck. Fast, so it never gets skipped.                                               |
| `.husky/commit-msg`     | **Enforced**              | Rejects commits with no `Plan:` trailer.                                                                   |
| `.husky/pre-push`       | **Enforced**              | Full `verify`.                                                                                             |
| GitHub Actions          | **Enforced**              | `verify:full` (verify + e2e + Semgrep). Catches `--no-verify`.                                             |
| `CODEOWNERS`            | **Enforced, server-side** | Human review required on auth, schema, and the gates.                                                      |

Three principles hold this together:

1. **Anything the agent could disable, enforce somewhere the agent isn't.** The
   permission list denies edits to `.husky/` and `.github/workflows/` — an agent
   that can edit its own gates has no gates. But a local permission list can be
   skipped with a flag, so CODEOWNERS puts the real gate on the server.

2. **Deny secrets and the gates themselves; everything else asks.** `auth.ts` is on
   the _ask_ list, not the deny list. Denying it outright would look stricter and be
   weaker — the agent has to write that file, so a permanent deny gets removed on
   day one. **A guardrail that blocks useful work gets switched off, and a
   switched-off guardrail protects nothing.**

3. **Keep the fast gate fast.** Pre-commit is seconds; the full suite runs on push.
   A gate slow enough to be annoying gets bypassed with `--no-verify`, and a
   bypassed gate is worse than no gate — it sells false confidence.

### The confidence loop

From `CLAUDE.md`:

> Before implementing, self-score your plan 1–10 on how confident you are it is
> correct and complete. **If below 8, stop and ask** — and name specifically what
> you're guessing about.

A question costs thirty seconds. A wrong guess costs an hour of debugging code that
is _mostly_ right, which is the most expensive kind of wrong.

### Prove the guardrails actually hold

An unverified guardrail is just a comment. Each of these should fail:

```bash
# Commit with no plan trailer → rejected by commit-msg
git commit --allow-empty -m "nope"

# Commit a fake secret → rejected by gitleaks
echo 'AKIAIOSFODNN7EXAMPLE' > leak.txt && git add leak.txt && git commit -m "test"

# Ask Claude Code to edit .husky/pre-commit → denied by the permission rules
# Ask it to hand-edit apps/api/src/db/schema.ts → denied; it must regenerate
```

---

## MCP servers

`.mcp.json` at the repo root registers MCP servers for any agent working in this
project. Project-scoped (not `.claude/`), so they're shared and versioned rather
than living in one person's local config.

| Server   | Type                                              | Why it's here                                                                                                                                                                                                                                                                | How to use                                                                                                                                                                                                                                                                                                                                                                                      |
| -------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sentry` | Hosted, remote MCP (`https://mcp.sentry.dev/mcp`) | Lets an agent read Sentry issues, stack traces, and run Seer autofix directly — instead of you pasting errors in by hand. See `apps/api/src/instrument.ts` for the SDK side, and `GET /api/crash` for a route that deliberately crashes to prove capture works.              | Run `/mcp` in an interactive Claude Code session and authorize via OAuth in the browser (one-time; no token lives in the repo). Then ask the agent to list recent issues or investigate a specific one.                                                                                                                                                                                         |
| `semble` | Local, stdio (`uvx --from semble[mcp] semble`)    | Fast code search across this repo (and related repos) by intent rather than exact string — `search "where sessions are validated"` finds the file and line without grepping for the right keyword first. `CLAUDE.md` tells agents to prefer it over grep.                    | Runs automatically once the `semble` MCP is available in your session — no separate auth step. Requires `uv`/`uvx` installed locally.                                                                                                                                                                                                                                                           |
| `neon`   | Hosted, remote MCP (`https://mcp.neon.tech/mcp`)  | Lets an agent inspect and operate the production Postgres (Neon): schemas, branches, SQL. **It can run SQL and migrations**, so it stays behind this repo's confirm-before-migrate rule — the MCP gives access, not permission. See `docs/plans/012-prod-deploy-and-mcp.md`. | Run `/mcp` and authorize via OAuth with your own Neon account (per-person; no key in the repo).                                                                                                                                                                                                                                                                                                 |
| `render` | Hosted, remote MCP (`https://mcp.render.com/mcp`) | Lets an agent see the deployed API on Render: services, deploys, logs, metrics, env vars. Render's server exposes no destructive actions (no service/DB deletion). See `docs/plans/012-prod-deploy-and-mcp.md`.                                                              | Render's MCP doesn't do OAuth — it takes a personal API key as a Bearer header. Create one in the Render dashboard (Account Settings → API Keys), then export `RENDER_API_KEY` from your shell profile before starting Claude Code (see "Deploy to production" below for exactly where to put it — and where not to); `.mcp.json` expands `${RENDER_API_KEY}` (per-person; no key in the repo). |

All are advisory conveniences, not gates — nothing in `verify` depends on them.

---

## Deploy to production (per student)

Everyone deploys **their own** instance — your accounts, your keys, your infra.
Claude Code drives the database and then _verifies_ the whole deployment
through the Neon and Render MCPs; the two Render services themselves come from
the `render.yaml` blueprint in one dashboard click. Full reasoning:
`docs/plans/012-prod-deploy-and-mcp.md`.

**Why not create the services via the Render MCP too?** Because it can't set the
`/api/*` rewrite — the MCP's static-site tools take no `routes` parameter, and
that rewrite is what makes prod same-origin. This is worth noticing rather than
hiding: an MCP is an API surface, not magic, and the honest move is to use it
for what it's actually good at (inspecting deploys, logs, env, schema) instead
of contorting the architecture to fit its gaps.

**Target shape:** everything on two services. API on Render (free web
service) · Postgres on Neon (free tier; Render's free Postgres self-deletes
after 30 days) · frontend as a Render **static site** (free, no spin-down)
whose rewrite rule proxies `/api/*` to the API service, so prod stays
same-origin like dev — no cookie or CORS changes. `render.yaml` describes both
Render services, and the Render MCP can see your entire deployment.

### Before class (accounts + MCP auth)

1. Create free accounts: [Neon](https://neon.tech), [Render](https://render.com).
2. Render API key: dashboard → Account Settings → API Keys. **Put the export
   in your shell profile, not in the repo** — Claude Code expands
   `${RENDER_API_KEY}` in `.mcp.json` from its own process environment at
   startup, so the key must be in the environment of the shell that launches
   it:

   ```bash
   # in ~/.zshrc (then restart Claude Code):
   export RENDER_API_KEY="rnd_..."
   ```

   Where **not** to put it: not in the repo's `.env` (that's loaded by the API
   server via `env.ts`, not by Claude Code — the MCP would never see it, and
   an infra-admin key doesn't belong in app runtime config), and not in
   `.mcp.json` itself (it's committed and shared; gitleaks would flag it —
   the `${RENDER_API_KEY}` placeholder is the point).

   The key is account-wide, so create it fresh for the workshop and revoke it
   in the Render dashboard afterward. If you want better hygiene than a
   plaintext dotfile, keep it in the macOS Keychain and resolve it in
   `~/.zshrc`:

   ```bash
   # one-time store:
   security add-generic-password -a "$USER" -s render-api-key -w "rnd_..."
   # in ~/.zshrc:
   export RENDER_API_KEY="$(security find-generic-password -s render-api-key -w)"
   ```

3. In Claude Code, run `/mcp` and authorize `neon` via OAuth. Confirm both
   `neon` and `render` show as connected.

### The walkthrough

Expect ~20 minutes, most of it waiting on builds. Steps 4–5 are a loop you
cannot skip: **neither service's URL exists until it is created**, and each one
needs the other's URL. That's the deploy teaching you something real about
circular config, not a mistake in the instructions.

1. **Database** — ask Claude: _"create a Neon project and give me the pooled
   connection string."_ Pooled means the `-pooler` host; that's what Render
   should use.

2. **Migrations** — run it once, pointed at Neon:

   ```bash
   DATABASE_URL='<your-neon-pooled-url>' npm run db:migrate
   ```

   Claude must **ask before applying** — that's the WON'T rule working, not a
   bug. Then ask it to _"list the tables in my Neon database"_ to confirm the
   five auth tables landed **on Neon**. Don't skip this: `drizzle.config.ts`
   loads the repo's `.env`, so a success message alone doesn't tell you _which_
   database you migrated. Verify where, not just whether.

3. **Create both services** — Render dashboard → **New → Blueprint** → pick your
   fork → select your branch. `render.yaml` defines the API and the static site
   with its `/api/*` rewrite. Render prompts for each `sync: false` value, so no
   secret is committed: paste the Neon `DATABASE_URL`, and leave
   `BETTER_AUTH_SECRET` to be generated. `BETTER_AUTH_URL` and `WEB_ORIGIN` you
   can't know yet — that's step 4.

   Render appends a random suffix if a name is taken (`auth-app-api` →
   `auth-app-api-lwrx`), since onrender.com subdomains are globally unique.
   **Yours will differ from the examples here.** Ask Claude: _"list my Render
   services and tell me both URLs."_

4. **Point the API at the web origin** — ask Claude: _"set BETTER_AUTH_URL and
   WEB_ORIGIN on my Render API service to my static site's URL."_ It does this
   over the Render MCP and triggers a redeploy.

   Both are the **static site's** URL, not the API's. Browsers reach the API
   _through_ the rewrite, so the static site is the public origin — the one
   cookies are signed for and the only one allowed to drive auth. Until they're
   set the API won't boot at all: `env.ts` refuses to start a half-configured
   auth server, which is the guardrail, not a crash.

5. **Point the rewrite at the API** — edit the `destination` in `render.yaml` to
   your **real** API URL, then commit and push. This one is _not_ an MCP call —
   routes live in the blueprint, so the change ships through git and Render
   syncs it. That's a feature: your routing config stays reviewable.

6. **Deploy, deliberately** — `render.yaml` sets `autoDeploy: false`, so pushing
   does **not** ship. Deploy from the dashboard's **Manual Deploy**, or ask
   Claude to trigger it via the Render MCP and watch until it's live.

   Why off: with autoDeploy on, `git push` _is_ a production deploy — so any
   agent that can push can ship, and `--no-verify` skips the only gate. This
   repo's rule is that anything an agent could disable gets enforced somewhere
   the agent isn't, and a deploy is exactly that kind of thing.

7. **Prove it** — against your **static site's** URL, not the API's:

   ```bash
   API=https://<your-site>.onrender.com npm run smoke
   ```

   6/6 green means signup → session → sign-out → sign-in all work in production,
   through the rewrite, against real Postgres. If `/api/me` returns 404 instead
   of 401, your step-5 rewrite isn't landing.

8. **Now distrust the green** — ask Claude: _"check my API logs for the
   better-auth client IP warning."_

   Smoke passes 6/6 whether or not rate limiting works per-client — a collapsed
   shared bucket still returns a 429, it just trips sooner. **The tests can't see
   the difference; a log line can.** You should see **no** warning. If you do,
   your API isn't resolving a client IP and the `/sign-in` limit is shared across
   all users at once — see `docs/plans/012-prod-deploy-and-mcp.md`.

9. **Operate from the editor** — ask Claude to list deploys, tail logs, or
   inspect the Neon schema read-only. That's the operate-live-infra story the
   MCPs exist for — and, per step 8, the part that catches what tests can't.

Free-tier caveat: Render spins the API down after 15 idle minutes; the first
request after that takes ~30–60s. That's the cold start, not a bug.

---

## Plans live with the code

Every change ships with a plan in `docs/plans/NNN-slug.md`, and the commit that
implements it carries a trailer:

```
Plan: docs/plans/001-auth-login.md
```

The `commit-msg` hook enforces it, and the trailer must point at a file that
exists. So:

```bash
git log --grep='^Plan:'     # every planned change in the repo's history
```

The reasoning behind any change is one link away, forever — which is the difference
between a repo you can learn from and a pile of commits saying "fix stuff".
