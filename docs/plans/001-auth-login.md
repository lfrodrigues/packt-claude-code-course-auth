# auth-app: a reference repo for production scaffolding + agent guardrails

## Context

`/Users/lfr/Development/PackCourse` is empty today (one stray `auth/asdasdas` scratch file; not a git repo). It's a container folder for course apps; this plan builds the first one as a **self-contained git repo at `PackCourse/auth-app/`**, demonstrating two things:

1. **The production scaffold** — the repo shape Claude Code works well in: folder conventions, strict typing, reliable boundaries, lint, format, test harness. Structure makes good agent output more likely.
2. **Guardrails and confidence loops** — what makes agent output _safe to trust_: pre-commit and pre-PR gates, blocked risky edits, WON'T rules, and a confidence loop where the agent self-scores its plan 1–10 and stops to ask instead of shipping a guess.

A working email/password login is the vehicle. It's chosen because auth has real risk surface — password hashing, session cookies, rate limiting — so the guardrails have something meaningful to protect, and "the tests are green" demonstrably isn't the same as "this is correct."

**Scope: auth only.** No domain APIs, no CRUD, no other resources. The only endpoints are the ones Better Auth mounts at `/api/auth/*` (sign-up, sign-in, sign-out, get-session) plus a single hand-written protected route, `GET /api/me`. That route earns its place twice over: it's the one example of guarding _your own_ endpoint with a session, and it's what makes the whole thing curl-testable.

**Governing principle:** this repo is _evidence for its own thesis_. Anywhere it says "trust me" instead of enforcing something mechanically is a place it contradicts itself. Every rule below is either tool-enforced or explicitly labeled advisory.

Decisions locked with the user: **Express API + Vite React SPA**, **Better Auth**, **Postgres + Drizzle**, **nested agent instruction files**, **plans committed to `docs/plans/` + commit trailer**, **all four guardrails wired for real**.

## Structure

**`PackCourse/auth-app/` is its own git repo and is entirely self-contained** — it clones and runs on its own, with no dependency on anything above it. `PackCourse/` is just a container folder holding sibling repos; a future app becomes `PackCourse/next-app/`, a separate repo with its own guardrails.

This is what makes the guardrails work cleanly: git hooks, GitHub Actions, and `.claude/settings.json` are all **repo-scoped**. With `git init` inside `auth-app/`, husky installs there, Actions reads `auth-app/.github/`, and the permission rules apply to exactly this app. Everything lands where it belongs, and a student can clone `auth-app` alone and get the whole lesson.

```
PackCourse/                        # plain container folder — NOT a repo
└── auth-app/                      # ← git init HERE; everything below is self-contained
    ├── README.md                  # quickstart, script table, curl recipes
    ├── AGENTS.md                  # cross-tool source of truth (Cursor, Copilot, etc.)
    ├── CLAUDE.md                  # `@AGENTS.md` import + Claude-specific rules
    ├── .claude/
    │   ├── settings.json          # permission deny/ask — the HARD guardrail
    │   └── rules/security.md      # path-scoped rules (frontmatter `paths:`)
    ├── .husky/{pre-commit,commit-msg,pre-push}
    ├── .github/
    │   ├── workflows/ci.yml       # postgres service container
    │   ├── CODEOWNERS             # server-side review gate on auth + gates
    │   ├── dependabot.yml
    │   └── pull_request_template.md
    ├── .gitleaks.toml             # secret scanning config
    ├── docker-compose.yml         # postgres:16 (app + test databases)
    ├── package.json               # workspaces: ["apps/*", "packages/*"]
    ├── tsconfig.base.json / eslint.config.js / .prettierrc / .editorconfig / .nvmrc
    ├── .env.example               # never a real .env
    ├── docs/
    │   ├── plans/README.md        # the plan-per-commit convention
    │   ├── plans/001-auth-login.md  # this plan, committed
    │   └── conventions.md         # rationale behind each scaffold decision
    ├── apps/
    │   ├── api/
    │   │   ├── CLAUDE.md          # loads only when Claude reads api files
    │   │   ├── drizzle.config.ts
    │   │   ├── src/{auth.ts,app.ts,server.ts,env.ts,error-handler.ts}
    │   │   ├── src/db/{index.ts,schema.ts}   # schema.ts is CLI-GENERATED
    │   │   ├── src/routes/me.ts   # the ONLY hand-written endpoint
    │   │   ├── drizzle/           # committed SQL migrations
    │   │   └── tests/auth.test.ts
    │   └── web/
    │       ├── CLAUDE.md          # loads only when Claude reads web files
    │       └── src/{lib/auth-client.ts,routes/Login.tsx,routes/Dashboard.tsx}
    ├── packages/shared/
    │   ├── CLAUDE.md              # "changing this breaks both sides"
    │   └── src/schemas.ts         # zod contracts used by BOTH apps
    └── e2e/login.spec.ts          # Playwright: the real flow in a real browser
```

npm workspaces (`["apps/*", "packages/*"]`) — one `npm install`, one `npm run dev`, and a real client/server boundary.

`packages/shared` is deliberate — it's what "reliable boundaries" means concretely. One zod schema validates the browser form _and_ the server payload, so field drift becomes a compile error instead of a runtime 400.

The stray `PackCourse/auth/asdasdas` file and its empty `auth/` directory get deleted during setup.

## Implementation

### 1. Agent instruction files (verified against Claude Code docs)

**Claude Code reads `CLAUDE.md`, not `AGENTS.md`.** The supported pattern:

```markdown
# CLAUDE.md

@AGENTS.md

## Claude Code

Use plan mode for changes under `apps/api/src/auth.ts`.
```

`AGENTS.md` holds conventions every tool should honor; `CLAUDE.md` imports it and adds Claude-specific behavior. No duplication, no drift.

**Nested files are the monorepo win:** the root `CLAUDE.md` loads at launch, but subdirectory `CLAUDE.md` files load **on demand — only when Claude reads a file in that directory**. So `apps/api/CLAUDE.md` can carry deep auth and migration rules that cost zero context while working on the frontend. Keep each under ~200 lines; the docs are explicit that longer files reduce adherence.

- `apps/api/CLAUDE.md` — handler-before-`express.json()` ordering; never hand-edit `db/schema.ts`; always add a migration; never log secrets.
- `apps/web/CLAUDE.md` — validate with shared schemas; never re-declare a type that exists in `packages/shared`.
- `packages/shared/CLAUDE.md` — this is a published contract; changes break both apps; update both call sites in the same commit.
- `.claude/rules/security.md` with `paths: ["apps/api/src/auth.ts", "apps/api/src/db/**"]` — auto-loads security rules whenever Claude touches auth or DB files.

The root `AGENTS.md` carries the durable conventions, WON'T rules, and confidence loop; the deep stack-specific rules live next to the code they govern. Keep each file under ~200 lines — the docs are explicit that longer files reduce adherence.

Important for anyone reading this repo to learn from it: **these files are context, not enforcement.** Anthropic's docs state it directly — _"CLAUDE.md instructions shape Claude's behavior but are not a hard enforcement layer."_ That's precisely why the permission rules in §4 exist.

### 2. Postgres + Drizzle + Better Auth

`docker-compose.yml` runs `postgres:16` with `packcourse` and `packcourse_test` databases — one `docker compose up -d` and you're live. Real connection strings and real migrations are more representative than SQLite's single file.

`npm i better-auth drizzle-orm pg express cors helmet zod` / `-D drizzle-kit @types/pg`.

**The schema is generated, never hand-written:**

```bash
npx @better-auth/cli@latest generate   # → src/db/schema.ts (user, session, account, verification)
npx drizzle-kit generate               # → drizzle/*.sql migration
npx drizzle-kit migrate                # apply
```

The two-step matters: the Better Auth CLI writes the **Drizzle schema**; drizzle-kit turns that into **SQL migrations**. Skip the second step and your types are correct while the database is empty — a typecheck that passes over an app that cannot work.

`src/auth.ts` — the security boundary:

```ts
betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  emailAndPassword: { enabled: true, minPasswordLength: 12 },
  // Better Auth DISABLES rate limiting in dev by default. Shipping auth
  // without this is exactly the kind of "mostly right" code this repo is about.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: { '/sign-in/email': { window: 60, max: 5 } },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: true } },
  trustedOrigins: [env.WEB_ORIGIN],
});
```

Password hashing is **scrypt** by default. Worth documenting explicitly, because "did it actually hash the password?" is a question a green test suite cannot answer for you.

`src/app.ts` exports an app factory so tests build an app without binding a port. **Ordering trap:** mount `app.all("/api/auth/*splat", toNodeHandler(auth))` **before** `express.json()`. The bare `*` is Express 4 syntax; Express 5 requires the named splat. Get either wrong and client calls hang on "pending" indefinitely.

`src/env.ts` zod-parses `DATABASE_URL`, `BETTER_AUTH_SECRET` (min 32 chars), `WEB_ORIGIN`, `PORT` and throws at boot — fail fast and loud rather than mysteriously later. `src/error-handler.ts` logs server-side and returns a generic message; stack traces never cross the wire. `helmet()` sets security headers.

**Logging with `pino`, configured to redact** — `redact: ["req.headers.cookie", "req.headers.authorization", "*.password", "*.token"]`. "Never log secrets" is in the WON'T rules, but a rule the model must remember is weaker than a logger that _cannot_ emit the value. Mechanize it.

`server.ts` handles **graceful shutdown**: on `SIGTERM`/`SIGINT`, stop accepting connections, drain in-flight requests, close the pg pool, exit. Plus `GET /healthz` (liveness + a `SELECT 1` DB check) — not a domain API, just the ops probe every deployed service needs.

**Dev is same-origin via the Vite proxy** (`/api` → `:3005`), which sidesteps third-party-cookie friction entirely. CORS is configured but only matters for a split-origin deploy — better to model same-origin as the default than to normalize reflexively loosening CORS.

### 3. React client

`createAuthClient({ baseURL: import.meta.env.VITE_API_URL })` exports `signIn`/`signUp`/`signOut`/`useSession`. `Login.tsx` validates with the **shared** zod schema and renders server errors inline — including the 429 rate-limit rejection, which is a real state the UI must handle. `ProtectedRoute.tsx` gates `Dashboard` on `useSession()`.

### 3.1 `README.md` — how to run it, and how to test it with curl

The entry point for anyone cloning the repo. Prerequisites (Node per `.nvmrc`, Docker), a copy-pasteable **quickstart** (`cp .env.example .env` → `docker compose up -d` → `npm install` → `npm run db:migrate` → `npm run dev`), the script table (`dev`, `verify`, `test`, `e2e`, `db:generate`, `db:migrate`), and a short map of the folder layout.

Then a **"Test the API with curl"** section — a cookie jar is the whole trick, since sessions are cookie-based and `-b/-c` is what makes them work:

```bash
API=http://localhost:3005

# 1. Sign up (writes the session cookie to a jar)
curl -i -c jar.txt -X POST $API/api/auth/sign-up/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"correct-horse-battery","name":"Ada"}'

# 2. Protected route WITHOUT the cookie → 401
curl -i $API/api/me

# 3. Protected route WITH the cookie → 200 + user JSON
curl -i -b jar.txt $API/api/me

# 4. Sign out, then confirm /api/me is 401 again
curl -i -b jar.txt -c jar.txt -X POST $API/api/auth/sign-out
curl -i -b jar.txt $API/api/me

# 5. Sign back in
curl -i -c jar.txt -X POST $API/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"correct-horse-battery"}'

# 6. Rate limit: 6 rapid bad passwords → the 6th returns 429
for i in $(seq 1 6); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST $API/api/auth/sign-in/email \
    -H 'Content-Type: application/json' \
    -d '{"email":"a@b.com","password":"wrong"}'
done
```

Two things the README should state plainly next to that block, because they're the questions people actually hit:

- **Password ≥ 12 chars**, or sign-up returns a validation error (`minPasswordLength: 12`).
- **Rate limiting is enabled in dev here**, unlike Better Auth's default — so hammering sign-in _will_ start returning 429. That's intentional, and step 6 proves it.

Include the `psql` one-liner to inspect the stored credential and confirm it's a scrypt hash, not plaintext — the one check no test in the suite performs for you.

### 4. Tests

**Vitest + Supertest** for the API; **Vitest + Testing Library** for the web; **Playwright** for one end-to-end pass. Vitest because Vite is already here for the frontend — one runner, one config language, one mental model across both workspaces. Adding Jest would mean a second toolchain and a second transform pipeline for nothing. Supertest because it drives the Express app **in-process** via the `createApp()` factory: no port binding, no dev server, no flake.

**Database isolation is the real design decision.** Tests run against the real `packcourse_test` Postgres — mocking the DB would mock away the exact things worth testing (constraints, the adapter, actual persistence). Isolation strategy:

- A global setup runs `drizzle-kit migrate` against `packcourse_test` once, before the suite.
- `beforeEach` truncates the Better Auth tables (`TRUNCATE "user", "session", "account", "verification" RESTART IDENTITY CASCADE`) so every test starts from a known empty state and test order can never matter.
- API tests run **single-threaded** (`poolOptions: { threads: { singleThread: true } }`) — parallel workers sharing one database is the classic source of tests that pass alone and fail together.
- `rateLimit` stays enabled in tests, because one of the tests is _about_ the rate limit. Tests that need many sign-in attempts use distinct emails so they don't trip it accidentally.

**`apps/api/tests/auth.test.ts`** — what's worth asserting, roughly one `describe` each:

- **Sign-up**: valid payload → 200 and a `Set-Cookie` session cookie; the user row exists in Postgres.
- **Password is hashed**: query the `account` row directly and assert the stored credential is neither the plaintext nor equal to it. This is the assertion that justifies talking to a real database — a mock can't tell you this, and no other test in the suite would catch a regression that stored plaintext.
- **Cookie flags**: the session cookie is `HttpOnly` and `SameSite=Lax`. Cheap to assert, and it's a security property that silently degrades when someone "fixes" a cookie problem later.
- **Weak password**: under 12 chars → rejected, and no user row is created.
- **Duplicate email**: second sign-up → rejected, still one row.
- **Sign-in**: correct password → 200 + cookie; wrong password → 401 and **no cookie issued**.
- **`GET /api/me`**: no cookie → 401; valid cookie → 200 with the right user; **tampered/garbage cookie → 401** (this is the one that catches a broken session check that a happy-path test sails straight past).
- **Sign-out**: after it, the same cookie no longer grants access to `/api/me`.
- **Rate limit**: 6 rapid bad sign-ins → the 6th is 429.

**`apps/web/tests/Login.test.tsx`** — renders errors for invalid credentials and for a 429, with `authClient` mocked. Deliberately thin: the frontend's job here is the form and its error states, not re-testing auth.

**`e2e/login.spec.ts`** (Playwright) — one full pass in a real browser: sign up → dashboard → reload (session survives the cookie) → sign out → `/dashboard` bounces to `/login`. This is the only test that exercises the Vite proxy, real cookie handling, and both apps together — everything below it is unit-scale.

**Coverage thresholds** in `vitest.config.ts` fail the build below target, so coverage is a gate rather than a dashboard nobody reads.

The line worth drawing for anyone learning from this repo: the assertions that matter here are the ones a _passing_ implementation could still get wrong — plaintext passwords, cookies without `HttpOnly`, a tampered session that's accepted, a rate limiter that isn't on. Happy-path tests confirm the feature exists. These confirm it's safe.

### 5. Guardrails

**`.claude/settings.json` — enforced by the harness, independent of what the model decides.**

```jsonc
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Edit(./.env)", // secrets never enter context
      "Edit(./.husky/**)", // agent may not disable its own gates
      "Edit(./.github/workflows/**)", // ...or the CI backstopping them
      "Edit(./.claude/**)", // ...or these rules
      "Edit(./apps/api/src/db/schema.ts)", // generated — regenerate, don't hand-edit
      "Edit(./package-lock.json)",
      "Bash(git push:*)",
      "Bash(rm -rf:*)",
    ],
    "ask": [
      "Edit(./apps/api/src/auth.ts)", // security boundary: human confirms
      "Edit(./packages/shared/**)", // shared contract: breaks both sides
      "Bash(drizzle-kit migrate:*)", // schema changes are one-way doors
    ],
  },
}
```

The list is deliberately narrow, and the reasoning is the lesson: **deny secrets and the gates themselves; everything else is `ask`.** An agent that can edit `.husky/` or `ci.yml` effectively has no gates — the self-reference is the point. But permanently denying `auth.ts` would be theater: the agent has to write that file, and blocking all future auth work buys nothing. `ask` is the honest control — a human reviews the diff and the work still gets done. **A guardrail that blocks useful work gets switched off, and a switched-off guardrail protects nothing.**

**`AGENTS.md` — WON'T rules + confidence loop (advisory, and labeled so).** Each phrased so a violation is visible in a diff:

- WON'T weaken, skip, or mock an auth check to make a test pass — WILL report the failure instead.
- WON'T hand-edit generated schema, or apply a migration without asking.
- WON'T commit or push unless asked; WON'T add a dependency without flagging it.

> **Confidence loop.** Before implementing, self-score the plan 1–10 on confidence it is correct and complete. **If below 8, stop and ask** — and name specifically what you are guessing about. A wrong guess costs more to debug than a question costs to answer.

**`.husky/commit-msg`** rejects any commit whose message lacks a `Plan: docs/plans/NNN-*.md` trailer pointing at a file that exists. The convention is mechanized rather than merely documented.

**`.husky/pre-commit` (fast) / `pre-push` (full).** Commit runs `lint-staged` + `typecheck` + related tests. Push runs full `verify` + Playwright. The split is itself the lesson: **a gate slow enough to be annoying gets bypassed with `--no-verify`, and a bypassed gate is worse than no gate because it sells false confidence.**

**Secret scanning — `gitleaks` in `pre-commit` and in CI.** The deny-list stops the agent _reading_ `.env`; nothing yet stops a secret being **committed**, and a pushed secret is the only truly irreversible mistake this repo can make. `.gitignore` is a convention that fails silently the moment someone writes a key into a source file; gitleaks is a mechanism that blocks the commit. Run it in CI too, since a local hook is bypassable.

**`CODEOWNERS` + branch protection — the guardrail the agent cannot reach.** The `ask` list above is a _local_ control: it disappears under `--dangerously-skip-permissions`, and it never existed for a human collaborator. Requiring a named reviewer on `apps/api/src/auth.ts`, `.husky/**`, and `.github/workflows/**` moves that gate **server-side**, where neither the agent nor a hurried human can switch it off.

```
/apps/api/src/auth.ts   @lfrodrigues
/apps/api/drizzle/      @lfrodrigues
/.husky/                @lfrodrigues
/.github/workflows/     @lfrodrigues
```

This is the point where local guardrails and pre-PR gates become one story: **anything the agent could disable, enforce somewhere the agent isn't.** Pair with branch protection on `main` (require PR, require CI green, require CODEOWNERS review) and a PR template whose first line is the `Plan:` link.

**`.github/workflows/ci.yml`** runs the identical `npm run verify` plus E2E against a Postgres service container, so a local `--no-verify` bypass is still caught. Specifics that matter: **`npm ci`, never `npm install`** (installs the committed lockfile exactly — CI must not silently resolve a different dependency tree than the one you tested); Node pinned from `.nvmrc`; `npx playwright install --with-deps chromium`; migrations run before tests; npm cache enabled. Vitest **coverage thresholds** fail the build below target — deterministic validation rather than judgment.

**Supply chain:** commit `package-lock.json`, run `npm audit --audit-level=high` as part of `verify`, and enable Dependabot for npm + Actions. An agent that can add dependencies needs a gate on what it pulls in.

**One `verify` script** — `typecheck && lint && test && audit` — invoked identically by hooks, CI, and humans. One definition of "green," no drift between them.

### 6. Plans committed alongside code

Each meaningful change gets `docs/plans/NNN-slug.md` committed with the code, and every implementing commit carries a `Plan: docs/plans/NNN-slug.md` trailer. `git log --grep='^Plan:'` then reconstructs the entire planned history, and each plan is browsable on GitHub — so anyone cloning the repo can read the plan that produced any given change. This plan ships as `docs/plans/001-auth-login.md`, the first worked example. Enforced by the `commit-msg` hook.

## Verification

Not "the tests pass" — actually drive it:

1. `docker compose up -d && npm install && npm run db:migrate && npm run dev` → API on :3005, web on :5173.
2. Browser: sign up → land on dashboard; hard-refresh (session survives via cookie); sign out; `/dashboard` redirects to `/login`.
3. `curl -i localhost:3005/api/me` — no cookie → **401**; with the signup cookie jar → **200 + user JSON**.
4. **Confirm the password is hashed:** `psql` into the database and read the stored credential — it must be a scrypt hash, not plaintext. Nothing in the test suite tells you this.
5. **Confirm the rate limit:** six rapid failed logins — the sixth returns **429**, and the UI renders that state rather than white-screening.
6. `npm test` (supertest against `packcourse_test`), `npm run e2e` (Playwright), `npm run verify` clean.
7. **Confirm the guardrails actually hold** — an unverified guardrail is just a comment:
   - Stage a type error → pre-commit rejects the commit.
   - Commit without a `Plan:` trailer → commit-msg rejects it.
   - Stage a file containing a fake AWS key → **gitleaks rejects the commit**.
   - Ask Claude Code to edit `.husky/pre-commit` → the deny-list refuses.
   - Ask it to hand-edit `db/schema.ts` → denied; it must regenerate instead.
   - Open a PR touching `auth.ts` → CODEOWNERS demands a human review.

---

## As-built addendum (what implementation taught us)

The plan above is committed as approved. Reality then disagreed in five places —
kept here rather than edited away, because the gap between plan and build is the
useful part:

1. **`cookieCache` is OFF, not on.** The plan enabled it. The sign-out test then
   failed: a cached cookie skips the DB lookup, so a _revoked_ session keeps
   working until the cache expires. Immediate revocation beats one saved read per
   request. The test caught a real design flaw in the plan — working exactly as
   intended.
2. **The schema CLI is `npx auth@latest generate`.** `@better-auth/cli` lags the
   `better-auth` package (1.4.x vs 1.6.x) and failed silently against it; the
   `auth` alias ships in lockstep. Also: `auth.ts` imports `db/schema.ts`, so the
   very first generation needs a two-line placeholder schema to bootstrap.
3. **`drizzle-orm` must also be a root devDependency.** npm hoisted `drizzle-kit`
   to the workspace root while `drizzle-orm` stayed nested in `apps/api`, and
   drizzle-kit's "please install latest drizzle-orm" error actually means "I
   can't resolve it from where I am."
4. **Rate-limit counters live in Postgres** (`storage: 'database'` — the plan
   didn't specify). In-memory counters reset per deploy and aren't shared across
   instances; database storage also makes the limiter _testable_, because the
   test setup truncates `rate_limit` between cases.
5. **curl sign-out needs an explicit `Origin` header** or Better Auth's CSRF
   check returns 403. Browsers send it automatically; the README recipe adds it
   by hand and explains why the 403 is a guardrail, not a bug.
