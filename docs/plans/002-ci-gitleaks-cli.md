# Replace licensed Gitleaks Action with the free Gitleaks CLI

## Context

CI is currently failing with `🛑 missing gitleaks license`, thrown by the
`gitleaks/gitleaks-action@v3` step in `.github/workflows/ci.yml`.
That Action wraps Gitleaks' Docker image, which now gates some usage behind a
paid `GITLEAKS_LICENSE` secret.

The fix: drop the Action entirely and run the official `gitleaks` CLI binary
directly via a `run:` step. The CLI itself is fully open source (MIT) and has
no license requirement — only the wrapping GitHub Action enforces the license
check for certain usage. This keeps the same detection engine and rules,
removes the license dependency, and avoids adding any new third-party Action
to trust.

## Change

In `.github/workflows/ci.yml`, replace the `Scan for secrets` step with a step
that downloads and runs the `gitleaks` CLI directly, scanning the full git
history already available via `fetch-depth: 0`:

```yaml
- name: Scan for secrets
  run: |
    curl -sSfL https://raw.githubusercontent.com/gitleaks/gitleaks/master/scripts/install.sh | sh -s -- -b /usr/local/bin
    gitleaks git --redact -v
```

Notes:

- `gitleaks git` scans the full commit history in the checkout (matches the
  existing `fetch-depth: 0` comment/intent).
- `--redact` avoids printing matched secret values to the log.
- No `GITHUB_TOKEN` or `GITLEAKS_LICENSE` env needed — the `env:` block for
  this step is removed.
- No config file changes needed; if the repo later wants custom rules, that's
  a separate `.gitleaks.toml`, not required for this fix.

## Verification

- Push to a branch / open a PR and confirm the `verify` job's "Scan for
  secrets" step runs, exits 0 on a clean tree, and no license error appears.
- Optionally sanity-check locally: run the same two commands in a shell inside
  the repo to confirm `gitleaks git --redact -v` exits cleanly.
