# apps/web

Vite + React 18 + React Router. Better Auth React client.

## Rules

- **Validate with the schemas in `@auth-app/shared`.** Never redefine a login or
  signup shape locally — that's how the browser and the server drift apart until
  someone gets a 400 they can't explain.
- **Client-side route gating is UX, not security.** `ProtectedRoute` stops a
  signed-out user seeing an empty dashboard. It protects nothing — anyone can edit
  the JS in their own browser. The server's session check is the real gate.
- **Handle the 429.** Rate limiting is enabled in dev in this repo, so "too many
  attempts" is a state real users reach. Every auth call site renders it.
- Dev is same-origin via the Vite proxy (`/api` → `:3005`), which is why the auth
  client needs no `baseURL` and cookies just work. If you're tempted to add
  `SameSite=None` or widen CORS to fix a cookie problem, the proxy is broken —
  fix that instead.
