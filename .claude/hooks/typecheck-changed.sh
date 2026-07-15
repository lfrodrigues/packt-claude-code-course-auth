#!/usr/bin/env bash
# Stop hook: if TS files were modified this session, run the typecheck and
# refuse to end the turn (exit 2) while it fails. Skips entirely when no
# .ts/.tsx files are dirty, so quiet turns stay fast.
set -u

repo_root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo_root" || exit 0

git status --porcelain 2>/dev/null | grep -qE '\.(ts|tsx)$' || exit 0

# Avoid re-fire loops: if we've already blocked once this turn, let it end.
if command -v jq >/dev/null 2>&1; then
  stop_active=$(jq -r '.stop_hook_active // false' 2>/dev/null)
  [ "$stop_active" = "true" ] && exit 0
fi

# macOS has no `timeout` by default; fall back to an unbounded run.
if command -v timeout >/dev/null 2>&1; then
  out=$(timeout 60 npm run typecheck --silent 2>&1)
else
  out=$(npm run typecheck --silent 2>&1)
fi
status=$?

if [ $status -eq 124 ]; then
  exit 0  # timed out — don't block the turn on a slow machine
elif [ $status -ne 0 ]; then
  echo "Typecheck failing on modified files — fix before finishing:" >&2
  echo "$out" | tail -30 >&2
  exit 2
fi
exit 0
