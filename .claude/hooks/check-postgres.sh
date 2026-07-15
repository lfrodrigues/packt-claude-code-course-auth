#!/usr/bin/env bash
# SessionStart hook: warn (never block) when Postgres isn't running, so the
# first test run of the session doesn't fail mysteriously.
set -u

repo_root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo_root" || exit 0

up=0
if command -v pg_isready >/dev/null 2>&1; then
  pg_isready -h localhost -p 5432 -q 2>/dev/null && up=1
elif command -v docker >/dev/null 2>&1; then
  docker compose ps --status running 2>/dev/null | grep -q postgres && up=1
else
  exit 0 # can't tell — stay quiet
fi

if [ "$up" -eq 0 ]; then
  echo "Postgres is not running — tests and pre-push will fail. Start it with: docker compose up -d"
fi
exit 0
