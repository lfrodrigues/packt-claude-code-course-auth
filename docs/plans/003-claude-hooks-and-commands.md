# Claude Code hooks and custom commands

## Context

The repo already has the load-bearing parts of a Claude Code setup: root and
nested `CLAUDE.md` (importing `AGENTS.md`), permission deny/ask rules in
`.claude/settings.json`, a path-scoped `.claude/rules/security.md`, and Husky
gates at the commit boundary. Two gaps remain, both **mid-session**: nothing
enforces conventions while the agent is working (only when it commits), and
recurring workflows (verify gate, plan scaffolding, migrations) are re-explained
each session. This plan adds hooks and commands to close both, following the
repo's principle: prefer deterministic enforcement over instructions.

## Hooks (`.claude/hooks/*.sh`, wired in `.claude/settings.json`)

Design principles: fast and selective (early return when not applicable,
timeouts); block via **stderr message + exit 2** so the agent sees the reason
and self-corrects; standalone scripts rather than inline commands so path
filtering, missing `jq`, and filenames with spaces are handled safely.

1. **`format-file.sh`** — PostToolUse on `Edit|Write`. Reads
   `.tool_input.file_path` from stdin, runs `npx prettier --write` on a
   whitelist of extensions (`.ts .tsx .json .md`). Early-returns for
   generated/protected paths and missing files.
2. **`protect-files.sh`** — PreToolUse on `Edit|Write`. Exits 2 with a reason
   when the target matches the protected set: generated
   `apps/api/src/db/schema.ts`, `drizzle/**` migrations, `.env*`, `.husky/**`,
   `package-lock.json`, `.claude/**`. A deterministic backstop for the
   permission deny list.
3. **`guard-bash.sh`** — PreToolUse on `Bash`. Reads `.tool_input.command`;
   exits 2 when a shell command would mutate protected paths indirectly
   (redirects, `sed -i`, `mv`/`cp` onto them, `rm` of migrations, better-auth
   schema generation outside the db command flow). Closes the gap where
   file-tool guards are bypassed through the shell; complements the permission
   rules, which match literal command patterns only.
4. **`typecheck-changed.sh`** — Stop hook. Exits 0 unless git shows modified
   `.ts/.tsx` files; otherwise runs `npm run typecheck` under a ~60s timeout
   and, on failure, prints the errors to stderr and exits 2 so the agent fixes
   them before ending its turn.

## Commands (`.claude/commands/*.md`)

Each command encodes policy constraints ("do not" lines), not just steps.

1. **`/project:verify`** — bring Postgres up (`docker compose up -d`), run
   `npm run verify`, fix failures, re-run until green. Never weaken a test to
   pass the gate.
2. **`/project:fix <failure>`** — narrow remediation loop: inspect, apply the
   smallest fix, re-run only the narrowest relevant check first, escalate to
   full `verify` last.
3. **`/project:plan <slug>`** — scaffold the next `docs/plans/NNN-<slug>.md`
   (highest NNN + 1) per `docs/plans/README.md`; refuse if a plan for the same
   slug exists unless told to supersede; remind about the `Plan:` trailer.
4. **`/project:ship <what>`** — create a `feat|fix|chore|docs/<slug>` branch,
   ensure plan + green `verify`, commit with the `Plan:` trailer, push with
   `-u`, report the PR URL. Push policy: pushing to `main`/`master` and
   force-pushing stay hard-denied (permissions + `guard-bash.sh`); other
   pushes moved from deny to **ask**, so each one is confirmed interactively.
5. **`/project:db-migrate`** — `npm run db:generate`, print a human-readable
   summary of tables/columns/indexes changed, show the SQL, apply with
   `npm run db:migrate` only after explicit confirmation. Never hand-edit
   generated SQL or schema files.

Considered and skipped: a `SessionStart` re-injection hook (CLAUDE.md + rules
already cover it); `.mcp.json`, skills, and subagents (no current need).

## Files touched

- `.claude/settings.json` — add `hooks` block (permissions untouched)
- `.claude/hooks/{format-file,protect-files,guard-bash,typecheck-changed}.sh` (new, executable)
- `.claude/commands/{verify,fix,plan,db-migrate,ship}.md` (new)

Note: the deny rule `Edit(./.claude/**)` means these files were created with
explicit per-file user approval — the guardrail working as designed.

## Verification

- Edit a `.ts` file in a session → prettier reformats it (PostToolUse fires).
- Attempt to Edit `apps/api/src/db/schema.ts` or `.env` → blocked with reason.
- `echo x > .env` and `sed -i '' … schema.ts` via Bash → guard-bash blocks.
- Introduce a type error, end a turn → Stop hook reports it and exits 2.
- `/project:verify` runs the gate; `/project:plan test-feature` creates
  `docs/plans/003-test-feature.md` with correct numbering.
