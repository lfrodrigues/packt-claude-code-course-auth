@AGENTS.md

## Claude Code specifics

The rules above are shared with every agent. These apply to Claude Code only.

### Plan mode

Use plan mode before touching `apps/api/src/auth.ts`, `apps/api/drizzle/`, or
anything under `packages/shared/` — a change to any of them has a blast radius
beyond the file you're editing.

### Permissions

`.claude/settings.json` denies edits to `.env`, `.husky/`, `.github/workflows/`,
`.claude/`, and the generated `db/schema.ts`; it asks before `auth.ts`,
`packages/shared/`, and migrations.

If a tool call is denied, **that is the guardrail working — do not route around
it.** Don't try the same edit via `Bash`, don't rewrite the settings file, and
don't propose disabling the hook. Tell the user what you wanted to do and why,
and let them decide.

### Nested instructions

`apps/api/`, `apps/web/`, and `packages/shared/` each have their own `CLAUDE.md`
with rules specific to that workspace. They load automatically when you read a
file in that directory, so you don't need to go looking for them.
