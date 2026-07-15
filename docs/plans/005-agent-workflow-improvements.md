# 005 — Agent workflow improvements

## Context

A review of the repo's agent setup (commands, hooks, permissions, CI) surfaced
gaps between the guardrail layers:

- Local `verify` diverged from CI: CI additionally runs `format:check` and the
  Playwright e2e suite, so "green locally = green in CI" was not quite true.
- The Stop hook ran `tsc --build --force` — a full rebuild on every turn end.
- `guard-bash.sh` missed the `git push origin HEAD:main` refspec spelling and
  `--force-with-lease`.
- The "drive the actual auth flow" rule had no runnable form — the README curl
  walkthrough was manual only.
- The agent had no permissions allow-list, so even running the verify gate
  prompted every time.
- Command files lacked frontmatter (`description`, `allowed-tools`), and there
  was no `/e2e` or `/smoke` command.
- No hint at session start when Postgres is down (the first failed test run of
  every session).

## Approach

- `package.json`: `verify` gains `format:check`; new `verify:full` (verify +
  e2e, the true CI definition), `smoke`, and `typecheck:incremental` (no
  `--force`, for the Stop hook).
- `scripts/smoke.sh` (new): mechanizes the README curl walkthrough — health
  check, unauthenticated 401, sign-up, authed `/api/me`, sign-out (with Origin
  header for the CSRF check) + 401, sign-in again. Non-zero exit on the first
  failure; never prints credentials or cookies.
- `AGENTS.md`: commands table gains `verify:full`/`smoke`; "verify before
  claiming" points at `npm run smoke`; new "Code search" note preferring the
  semble MCP over grep (advisory).
- `.claude/` changes (applied manually by the repo owner — agent edits there
  are denied by design): permissions `allow` block for verification commands
  (excluding `test:watch`, which never exits); frontmatter on all command
  files; new `/e2e` and `/smoke` commands; Stop hook switched to
  `typecheck:incremental`; `guard-bash.sh` push regex extended to refspec form
  and `--force-with-lease`; new SessionStart hook that warns when Postgres is
  down.

Rejected along the way: a `customCommands` block in settings.json (not a real
Claude Code feature — slash commands in `.claude/commands/` are the mechanism),
and duplicating the Plans section into `CLAUDE.md` (it already imports this
file's version; two copies would drift).

## Files touched

- `package.json`
- `scripts/smoke.sh` (new)
- `AGENTS.md`
- `.claude/settings.json`, `.claude/commands/*.md` (5 edited, 2 new),
  `.claude/hooks/typecheck-changed.sh`, `.claude/hooks/guard-bash.sh`,
  `.claude/hooks/check-postgres.sh` (new) — applied manually

## Verification

- `npm run verify` green with the new `format:check` step.
- Postgres up + API running, `npm run smoke` → 6/6 checks green against the
  real server.
- `npm run typecheck:incremental` run twice — second run near-instant.
- After applying the `.claude/` changes: `/e2e` and `/smoke` show in the `/`
  picker; `git push origin HEAD:main` is blocked by the bash guard; a new
  session with Postgres down surfaces the warning.
