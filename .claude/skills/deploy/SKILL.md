---
description: Deploy the current commit to production on Render, gated on a green verify and a prod smoke
argument-hint: [service name or blank for the API]
allowed-tools: Bash(npm run verify), Bash(npm run smoke:*), Bash(git status:*), Bash(git log:*), mcp__render__list_services, mcp__render__trigger_deploy, mcp__render__get_deploy, mcp__render__list_deploys, mcp__render__list_logs
---

# Deploy to production

What to deploy: $ARGUMENTS

Render's services are `autoDeploy: false` on purpose: a `git push` must not ship
to production. This command is the deploy path, and the gate lives inside it.

1. **Refuse to deploy uncommitted work.** `git status` must be clean, and the
   branch must be pushed — Render deploys what is on GitHub, not what is on
   your disk. If they differ, stop and say so.
2. **Run `npm run verify`. If it is red, STOP and report the failure.** Do not
   deploy, do not "fix it quickly first", do not rerun hoping it passes. A red
   verify is the answer, not an obstacle.
3. Find the service and trigger the deploy via the Render MCP
   (`list_services` → `trigger_deploy`).
4. **Watch until it is actually live** (`get_deploy` / `list_deploys`). A deploy
   that reaches `update_failed` or `build_failed` is a failed deploy — report
   the status and the build log tail. Do not report success on a queued deploy.
5. **Smoke the deployed app**, against the STATIC SITE's URL (that is the public
   origin; the API is reached through its `/api/*` rewrite):

   ```bash
   API=https://<static-site>.onrender.com npm run smoke
   ```

   6/6 or it did not work. Report the failing step verbatim.

6. **Then distrust the green.** Read the API logs via the Render MCP and check
   for better-auth's "could not determine a client IP" warning. Smoke passes
   6/6 whether or not per-client rate limiting works — a collapsed shared bucket
   still returns a 429, it just trips sooner. **The suite cannot see the
   difference; the log line can.** If the warning is present, say so plainly:
   the deploy is up and a security property is broken. See
   `docs/plans/012-prod-deploy-and-mcp.md`.

Policy:

- There is **no force flag and no skip-checks flag**, deliberately. Break-glass
  is human-only: Render's dashboard → Manual Deploy. If you find yourself
  wanting to bypass step 2, that is the gate doing its job — tell the user what
  is red and let them decide.
- Do not re-enable `autoDeploy` to work around a failure here.
- Never report "deployed" from a `queued` or `in_progress` status. Wait, or say
  it is still running.
