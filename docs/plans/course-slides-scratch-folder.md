# Course slides scratch folder

## Context

Preparing a 3.5-hour Packt workshop ("Claude Code Workshop: Orchestrating
Production-Grade Apps", July 31) that uses this repo as the live demo. The
workshop slide deck skeleton (one Markdown file per section, sparse
content + speaker notes, timed to the published agenda) is being drafted
alongside the repo so the material can reference real files, commits, and
plans in this codebase as they exist.

The deck isn't part of the app and has no runtime surface — it's course
collateral. It's being tracked in this repo (rather than kept purely local)
so it travels with the commits/plans it references and survives a machine
switch, but it doesn't belong in the shipped product and shouldn't appear in
`npm run verify`, lint, or the app's build output.

## Approach

- Add `SLIDES/` at the repo root: `00-README.md` (index) plus one file per
  agenda section (`01-why-cc-fails.md` … `07-live-build.md`).
- Each section file uses one `##` heading per slide, with a **Content** block
  (on-slide bullets) and a **Notes / what to do** block (speaker notes, demo
  commands, timing). Slide headings carry a cumulative `⏱ hh:mm` start time
  matching the published Eventbrite agenda (00:00–03:00 for the sections this
  presenter owns; the closing keynote is a separate speaker and out of scope).
- No app code, config, or CI changed. `SLIDES/` sits outside `apps/`,
  `packages/`, and all tool configs (tsconfig, eslint, vitest, knip), so it is
  inert with respect to `npm run verify`.
- Tracked as real, committed content for now (not gitignored) so the deck
  travels with the repo; may be moved out to a separate docs location or
  gitignored again later once the course material stabilizes.

## Files touched

- `SLIDES/00-README.md` — index and format legend
- `SLIDES/01-why-cc-fails.md` through `SLIDES/07-live-build.md` — one file
  per workshop section

## Verification

- Content-only change, no build/runtime surface: `npm run verify` is
  unaffected by design (`SLIDES/` isn't in the TypeScript project, ESLint
  config, or Vitest config) — confirmed by running `npm run verify` after
  adding the folder and observing no new files picked up by any tool.
- Manually reviewed each section file against the current repo state
  (command names, file paths, plan numbers, CLAUDE.md content) so the speaker
  notes don't reference stale filenames or removed docs (e.g. `AGENTS.md`,
  which no longer exists — the repo now has a single root `CLAUDE.md`).
