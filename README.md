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

Prerequisites: Node (see `.nvmrc`), Docker, and `npm`.

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

| Command               | What it does                                                  |
| --------------------- | ------------------------------------------------------------- |
| `npm run dev`         | API + web, together                                           |
| `npm run verify`      | **typecheck + lint + test + audit** — the definition of green |
| `npm test`            | Unit/integration (API hits a real test database)              |
| `npm run e2e`         | Playwright, real browser, full login flow                     |
| `npm run db:migrate`  | Apply migrations                                              |
| `npm run db:generate` | Drizzle schema → SQL migration                                |

`verify` is what the git hooks and CI both run. One definition of green, no drift.

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

| Guardrail                 | Kind                      | What it does                                                                                               |
| ------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` / `CLAUDE.md` | **Advisory**              | WON'T rules + the confidence loop. Shapes behavior; guarantees nothing.                                    |
| `.claude/settings.json`   | **Enforced**              | Blocks edits to `.env`, `.husky/`, CI, `.claude/`, generated schema. Asks before `auth.ts` and migrations. |
| `.husky/pre-commit`       | **Enforced**              | gitleaks + lint + typecheck. Fast, so it never gets skipped.                                               |
| `.husky/commit-msg`       | **Enforced**              | Rejects commits with no `Plan:` trailer.                                                                   |
| `.husky/pre-push`         | **Enforced**              | Full `verify`.                                                                                             |
| GitHub Actions            | **Enforced**              | Same `verify`, plus E2E. Catches `--no-verify`.                                                            |
| `CODEOWNERS`              | **Enforced, server-side** | Human review required on auth, schema, and the gates.                                                      |

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

From `AGENTS.md`:

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

| Server   | Type                                              | Why it's here                                                                                                                                                                                                                                                   | How to use                                                                                                                                                                                              |
| -------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sentry` | Hosted, remote MCP (`https://mcp.sentry.dev/mcp`) | Lets an agent read Sentry issues, stack traces, and run Seer autofix directly — instead of you pasting errors in by hand. See `apps/api/src/instrument.ts` for the SDK side, and `GET /api/crash` for a route that deliberately crashes to prove capture works. | Run `/mcp` in an interactive Claude Code session and authorize via OAuth in the browser (one-time; no token lives in the repo). Then ask the agent to list recent issues or investigate a specific one. |
| `semble` | Local, stdio (`uvx semble`)                       | Fast code search across this repo (and related repos) by intent rather than exact string — `search "where sessions are validated"` finds the file and line without grepping for the right keyword first. `AGENTS.md` tells agents to prefer it over grep.       | Runs automatically once the `semble` MCP is available in your session — no separate auth step. Requires `uv`/`uvx` installed locally.                                                                   |

Both are advisory conveniences, not gates — nothing in `verify` depends on them.

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
