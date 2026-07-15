---
description: Verify, commit with a plan trailer, and push a feature branch
argument-hint: <what to ship>
allowed-tools: Bash(git status:*), Bash(git checkout -b:*), Bash(npm run verify)
---

# Create a branch and push it to GitHub

What to ship: $ARGUMENTS

1. Confirm the working tree state with `git status`. If there are changes that
   don't belong to this work, stop and ask which files to include.
2. If still on `main`, create a feature branch: `git checkout -b <type>/<slug>`
   where `<type>` is `feat|fix|chore|docs` and `<slug>` is kebab-case from the
   arguments.
3. Ensure the change has a plan in `docs/plans/` (create one via
   `/project:plan` if missing — the commit-msg hook requires the trailer).
4. Run `npm run verify` before committing. Do not commit red.
5. Commit with a concise message ending in the `Plan: docs/plans/NNN-*.md`
   trailer.
6. Push the branch: `git push -u origin <branch>` (this will prompt for
   confirmation — that's the guardrail).
7. Print the GitHub compare/PR URL from the push output.

Policy:

- Do NOT push to `main`/`master` and do NOT force-push — both are hard-blocked.
- Do NOT use `--no-verify` to skip hooks.
- Do NOT open a PR unless explicitly asked; stop after pushing and reporting
  the URL.
