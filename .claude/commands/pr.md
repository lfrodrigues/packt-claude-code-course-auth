---
description: Open a PR for the current branch using the plan file as context
argument-hint: [additional context]
allowed-tools: Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(gh pr create:*), Bash(gh pr view:*)
---

# Open a pull request

Additional context: $ARGUMENTS

1. Confirm the branch is pushed and is not `main`/`master`
   (`git rev-parse --abbrev-ref HEAD`; if unpushed, push it first as `/ship`
   does — do not force-push).
2. Find the plan(s) behind this branch: `git log main..HEAD --grep='^Plan:'`
   (or the equivalent base branch). Read the referenced `docs/plans/NNN-*.md`
   file(s) for the Context/Approach/Verification content.
3. Draft the PR title (concise, imperative) and body from that plan content —
   not a generic diff summary. Include a "Verification" section describing
   what was actually run (from the plan's own verification section).
4. Run `gh pr create` with the drafted title/body. Use the repo's
   `.github/pull_request_template.md` structure if the repo has one and the
   drafted content doesn't already follow it.
5. Print the PR URL.

Policy:

- Do NOT open a PR against `main`/`master` from `main`/`master` itself, and do
  NOT force-push to get there.
- Do NOT fabricate a plan or verification section if none exists — if the
  branch has commits with no `Plan:` trailer, stop and say so; that shouldn't
  be possible given the `commit-msg` hook, but don't paper over it if it
  happens.
- This command only opens the PR; it does not merge it.
