#!/usr/bin/env bash
# PreToolUse (Bash): block shell commands that would mutate protected paths
# indirectly (redirects, sed -i, mv/cp, rm), bypassing the file-tool guards.
# Complements the permission deny list, which matches literal patterns only.
set -u

command -v jq >/dev/null 2>&1 || exit 0

cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null) || exit 0
[ -n "$cmd" ] || exit 0

block() {
  echo "BLOCKED: $1" >&2
  exit 2
}

protected='(\.env[^ ]*|\.husky/|\.claude/|apps/api/src/db/schema\.ts|drizzle/|package-lock\.json)'

# Writes onto protected paths: redirects, in-place edits, moves/copies, tee.
if echo "$cmd" | grep -qE "(>|>>)[[:space:]]*[^ ]*$protected"; then
  block "shell redirect targets a protected path. Use the approved flow instead."
fi
if echo "$cmd" | grep -qE "(sed[[:space:]]+(-[a-zA-Z]*i|--in-place)|tee[[:space:]]).*$protected"; then
  block "in-place edit of a protected path via shell. Use the approved flow instead."
fi
if echo "$cmd" | grep -qE "(mv|cp)[[:space:]].*$protected"; then
  block "mv/cp onto a protected path. Use the approved flow instead."
fi
if echo "$cmd" | grep -qE "rm[[:space:]].*(drizzle/|\.husky/)"; then
  block "deleting migrations or git hooks is not allowed."
fi

# git push: feature branches are allowed (permission layer asks); pushing to
# main/master or force-pushing is never allowed.
if echo "$cmd" | grep -qE "git[[:space:]]+push"; then
  if echo "$cmd" | grep -qE "git[[:space:]]+push.*[[:space:]](main|master)([[:space:]]|$|:)"; then
    block "pushing to main/master is not allowed. Push a feature branch and open a PR."
  fi
  if echo "$cmd" | grep -qE "git[[:space:]]+push.*([[:space:]]--force([[:space:]]|$)|[[:space:]]-f([[:space:]]|$))"; then
    block "force-push is not allowed."
  fi
  # Bare `git push` (no remote/refspec, flags only) while on main/master would
  # push main implicitly.
  if echo "$cmd" | grep -qE "git[[:space:]]+push([[:space:]]+-[^[:space:]]+)*[[:space:]]*$"; then
    branch=$(git -C "$(dirname "$0")/../.." rev-parse --abbrev-ref HEAD 2>/dev/null)
    case "$branch" in
      main|master) block "you are on $branch; bare 'git push' would push it. Create a feature branch first." ;;
    esac
  fi
fi

# Schema generation outside the approved db command flow.
if echo "$cmd" | grep -qE "better-auth.*(generate|migrate)" && ! echo "$cmd" | grep -qE "npm run db:"; then
  block "run schema generation via 'npm run db:auth-schema' / /project:db-migrate, not the CLI directly."
fi

exit 0
