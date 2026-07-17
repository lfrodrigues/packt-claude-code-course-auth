# Migrate .claude/commands to .claude/skills

## Context

Claude Code's docs now state that custom commands have been merged into the
skills system: a file at `.claude/commands/deploy.md` and a skill at
`.claude/skills/deploy/SKILL.md` both create `/deploy` and behave the same,
but skills are the documented, go-forward format (optional supporting-file
directories, invocation-control frontmatter, auto-load by Claude). The old
`.claude/commands/*.md` files keep working — this isn't a functional fix, just
bringing the repo in line with current guidance, which matters here because
this repo is also the demo repo for a Claude Code workshop and should model
current best practice for students.

## Approach

Convert each of the 8 files in `.claude/commands/` to
`.claude/skills/<name>/SKILL.md`, preserving frontmatter (`description`,
`allowed-tools`) and body content unchanged — this is a location/format
migration, not a content rewrite. Remove the old `.claude/commands/` files
once the skill equivalents exist.

## Files touched

- `.claude/skills/{fix,e2e,pr,smoke,verify,ship,db-migrate,plan}/SKILL.md` (new)
- `.claude/commands/*.md` (removed, 8 files)

## Verification

- `/verify`, `/smoke`, `/plan`, etc. still invoke correctly after migration.
- `find .claude/skills .claude/commands` shows commands/ gone, skills/
  populated with the same 8 names.
