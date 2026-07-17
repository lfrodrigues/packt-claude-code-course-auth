---
description: Narrow remediation loop — smallest root-cause fix, narrowest re-check first
argument-hint: <failure to fix>
allowed-tools: Bash(npm run typecheck), Bash(npm run lint:*), Bash(npm test:*), Bash(npm run verify)
---

# Narrow remediation loop

Failure to fix: $ARGUMENTS

1. Reproduce and inspect the failure. Read the actual error before touching code.
2. Apply the **smallest** fix that addresses the root cause.
3. Re-run only the narrowest relevant check first: the single failing test
   file, `npm run typecheck`, or `npm run lint` on the affected package.
4. Only when the narrow check passes, escalate to the full gate:
   `npm run verify`.

Policy:

- Do NOT fix a symptom by deleting the assertion, loosening a type, or adding
  `any` / `@ts-ignore` / eslint-disable. If the correct fix is unclear, stop
  and say what you're unsure about.
- Do NOT hand-edit generated schema files or migrations.
