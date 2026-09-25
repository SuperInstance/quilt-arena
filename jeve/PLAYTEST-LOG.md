# JEVE playtest log — fleet playtest, 2026-09-26 (kimi1)

Source: z portfolio v4 drop (`quilt-portfolio-2026-09-25 (4).zip`), pushed as
this branch. FINDINGS.md's numbers are z's own live-run results and are
**not** independently reproduced here (see Blocked).

## Fixed in this branch (unambiguous breaks only, no invented semantics)

1. `smoke.mjs` / `arena5.mjs` imported `buildJeveSheet` — mind.mjs exports
   `buildJevSheet` (mid-refactor rename; `run.mjs` already used the new name).
   Consumers aligned to `buildJevSheet`.
2. `arena5.mjs` imported `JEVE` (missing) for `FAMILIES5`; FAMILIES are plain
   name strings, so it is now the literal `'JEVE'`.
3. Dead imports `HKEYS` (arena5) and `HYPS` (smoke) — never referenced — dropped.
4. Layout: `smoke.mjs`/`run.mjs` import cortex via `../../quilt-cortex/…` —
   the portfolio is monorepo-shaped. To run: clone **quilt-cortex as a sibling
   of quilt-arena**, then `npm install` in quilt-arena (engine needs `yaml`).

## Blocked — missing seam API (NOT reconstructed on purpose)

`smoke.mjs` and `arena5.mjs` import `buildSeamState`, `buildSeamQuestions`,
`seamAnswerToTeachInput` from `./mind.mjs`. **mind.mjs exports none of them,
and they exist nowhere in the repo.** The seam layer (doubt-gated System One
consults — the subject of the FINDINGS headline) was lost or renamed in
packaging. Reconstructing it from call sites would mean inventing z's
semantics; the honest move is to flag it and let z re-export the real module.

What we know from usage: `seamAnswerToTeachInput(answers)` maps seam answers
into the `learn.revise` teach input; seams fire at phase boundaries
(`seamPoints: ['end']`).

## Verification status

- Module graph: resolves to the seam imports, then stops — single named break.
- z's claimed numbers (planted-formula 0.828, round-robin 52, doubt economy
  17%, live 22-call recovery) are **z-reported, marked as such in FINDINGS.md**,
  chain receipts (`outputs/round_ledger.jsonl`) present for audit.
- `node smoke.mjs` remains RED until the seam module lands. This branch is a
  repair milestone, not a green claim.
