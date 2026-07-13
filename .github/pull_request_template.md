Plan: docs/plans/<!-- NNN-slug.md — the plan this PR implements -->

## What changed

<!-- One or two sentences. What does this do that the code didn't do before? -->

## How it was verified

<!-- Not "tests pass" — what did you actually run? Which flow did you drive? -->

- [ ] `npm run verify` is green
- [ ] Drove the affected flow by hand (curl or browser), not just tests

## Confidence

<!-- 1–10, and if below 8, say what you're unsure about. Honest beats confident. -->

## Security checklist (delete if this PR touches no auth/DB code)

- [ ] No auth check weakened, skipped, or mocked to make a test pass
- [ ] Rate limiting still enabled
- [ ] Session cookies still `HttpOnly` + `SameSite=Lax`
- [ ] `db/schema.ts` regenerated, not hand-edited; migration committed
- [ ] No secrets in the diff, and no new logging of credentials
