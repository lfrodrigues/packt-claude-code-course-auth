# packages/shared

**This is a published contract, not a utility folder.**

Both `apps/api` and `apps/web` import these schemas. A change here is a change to
the wire format between them.

## Rules

- **Changing a schema breaks both sides. Update both call sites in the same
  commit.** Never "just fix the frontend" — that's how you get a client sending a
  field the server silently ignores.
- `MIN_PASSWORD_LENGTH` is consumed by Better Auth's `minPasswordLength` in
  `apps/api/src/auth.ts` _and_ by the login form's validation. It exists so the two
  cannot disagree. Don't hardcode `12` anywhere else.
- Anything added here ships to the browser. No secrets, no server-only imports,
  no `node:` builtins.
- Prefer widening (adding optional fields) over changing existing ones.
