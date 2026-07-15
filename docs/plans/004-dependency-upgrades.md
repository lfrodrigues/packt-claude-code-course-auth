# Dependency upgrade batch

## Context

A batch of Dependabot PRs is open against the repo, covering every workspace:
`pino` (apps/api), `react`/`react-router-dom` (apps/web), `dotenv` (apps/api),
and a 13-package root dev-dependency group (eslint, vitest, vite, typescript,
etc.). Several are majors (React 18→19, react-router-dom 6→7, ESLint 9→10,
Vite 7→8, Vitest 3→4, pino 9→10), so this is applied and verified in risk-
grouped batches rather than one blanket update, so a break can be isolated to
the group that caused it.

The listed TypeScript bump (5.9.3 → 7.0.2) is deferred: it skips v6 entirely,
and the installed `typescript-eslint` (bumped to 8.64.0 here, patch-only)
declares a peer range of `typescript >=4.8.4 <6.1.0` — applying it now would
break `npm run typecheck`/`npm run lint`. Revisit once typescript-eslint
supports TS 7.x.

## Groups

1. **Low-risk minor/patch**: `dotenv` 16.6.1→17.4.2, `pino` 9.14.0→10.3.1
   (+ `pino-http`/`pino-pretty` if npm flags a peer conflict), `concurrently`
   9.2.4→10.0.3, `lint-staged` 15.5.2→17.0.8, `typescript-eslint`
   8.63.0→8.64.0, `@types/supertest` 6.0.3→7.2.1.
2. **React + react-router-dom** (coupled majors): `react`/`react-dom`
   18.3.1→19.2.7, `@types/react`/`@types/react-dom` matching,
   `react-router-dom` 6.30.4→7.18.1.
3. **ESLint tooling majors**: `@eslint/js` 9.39.5→10.0.1, `eslint`
   9.39.5→10.7.0, `eslint-config-prettier` 9.1.2→10.1.8.
4. **Vite/Vitest majors**: `vitest`/`@vitest/coverage-v8` 3.2.7→4.1.10,
   `vite` 7.3.6→8.1.4, `@vitejs/plugin-react` 5.2.0→6.0.3, `jsdom`
   25.0.1→29.1.1.

Each group: apply bumps → `npm run verify` → fix within scope → commit.
Group 2 additionally gets a manual `npm run dev` walk-through of login →
dashboard → logout and the redirect paths in `ProtectedRoute.tsx`/`App.tsx`.
Group 4 additionally gets a `npm run dev` smoke check of the Vite proxy and a
check that coverage thresholds are still meaningfully enforced.

Full plan detail: see conversation / `docs/plans/` history for reasoning.
