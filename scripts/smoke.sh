#!/usr/bin/env bash
# Smoke test: drive the real auth flow against a running API, exactly like the
# README's curl walkthrough. Signup → authed /api/me → sign-out → 401 → sign-in.
#
# Usage: npm run smoke            (server must already be running)
#        API=http://localhost:3005 WEB_ORIGIN=http://localhost:5173 npm run smoke
#
# Never prints credentials or cookies. Exits non-zero on the first failure.
set -u

API=${API:-http://localhost:3005}
WEB_ORIGIN=${WEB_ORIGIN:-http://localhost:5173}

jar=$(mktemp)
trap 'rm -f "$jar"' EXIT

email="smoke-$(date +%s)-$RANDOM@example.com"
password="smoke-$(openssl rand -hex 12 2>/dev/null || echo fallback-pw-8charsplus)"

pass=0
fail() {
  echo "✖ $1" >&2
  exit 1
}
ok() {
  pass=$((pass + 1))
  echo "✔ $1"
}

# 0. Server reachable?
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/healthz" || true)
[ "$code" = "200" ] || fail "API not reachable at $API (GET /healthz → ${code:-none}). Start it with: npm run dev:api"
ok "API is up ($API)"

# 1. Protected route without a session → 401
code=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/me")
[ "$code" = "401" ] || fail "/api/me without a cookie should be 401, got $code"
ok "/api/me is protected (401 unauthenticated)"

# 2. Sign up → 200 and a session cookie in the jar
code=$(curl -s -o /dev/null -w '%{http_code}' -c "$jar" \
  -X POST "$API/api/auth/sign-up/email" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$email\",\"password\":\"$password\",\"name\":\"Smoke Test\"}")
[ "$code" = "200" ] || fail "sign-up returned $code (expected 200)"
ok "sign-up succeeded"

# 3. Protected route with the cookie → 200
code=$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" "$API/api/me")
[ "$code" = "200" ] || fail "/api/me with a fresh session should be 200, got $code"
ok "/api/me returns 200 with a session"

# 4. Sign out (needs Origin header — Better Auth CSRF check), then cookie is dead
code=$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" -c "$jar" \
  -X POST "$API/api/auth/sign-out" \
  -H "Origin: $WEB_ORIGIN")
[ "$code" = "200" ] || fail "sign-out returned $code (expected 200; 403 means the Origin/trustedOrigins check failed)"
code=$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" "$API/api/me")
[ "$code" = "401" ] || fail "/api/me after sign-out should be 401, got $code"
ok "sign-out kills the session (401 after)"

# 5. Sign back in → 200 and a working session again
code=$(curl -s -o /dev/null -w '%{http_code}' -c "$jar" \
  -X POST "$API/api/auth/sign-in/email" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$email\",\"password\":\"$password\"}")
[ "$code" = "200" ] || fail "sign-in returned $code (expected 200)"
code=$(curl -s -o /dev/null -w '%{http_code}' -b "$jar" "$API/api/me")
[ "$code" = "200" ] || fail "/api/me after sign-in should be 200, got $code"
ok "sign-in restores access"

echo ""
echo "Smoke passed: $pass/6 checks green."
