#!/usr/bin/env bash
# PostToolUse (Edit|Write): format the edited file with prettier.
# Fast-path exits: not a formattable extension, protected/generated path,
# file missing, or jq unavailable. Never blocks (always exits 0).
set -u

command -v jq >/dev/null 2>&1 || exit 0

file_path=$(jq -r '.tool_input.file_path // empty' 2>/dev/null) || exit 0
[ -n "$file_path" ] && [ -f "$file_path" ] || exit 0

case "$file_path" in
  *.ts|*.tsx|*.json|*.md) ;;
  *) exit 0 ;;
esac

# Never auto-format generated or protected artifacts.
case "$file_path" in
  */apps/api/src/db/schema.ts|*/drizzle/*|*/.husky/*|*/node_modules/*|*/package-lock.json) exit 0 ;;
esac

cd "$(dirname "$0")/../.." || exit 0
npx prettier --write --log-level warn "$file_path" >/dev/null 2>&1 || true
exit 0
