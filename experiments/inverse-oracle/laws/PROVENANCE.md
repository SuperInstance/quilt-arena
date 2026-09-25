# PROVENANCE — hidden-law library

Everything the inference mind is allowed to SEE at probe time is `laws.mjs`'s
black-box runner. The files here are the hidden ground truth, vendored from
the fleet so this experiment is self-contained:

- `reversi_canon.mjs` — elite specimen `01.ray_loop.56c863e30a` from
  quilt-loom `outputs/elites/reversi_flips/` (crowned by the Divergence
  Foundry; behaviorally identical to the Reversi flips spec, divergent code).
- `hand_canon.mjs` — elite specimen `01.bit_count_scan.e0b651489c` from
  quilt-loom `outputs/elites/hand_eval5/` (5-card poker evaluation).
- `life_canon.mjs` — canonical B3/S23 life step, verbatim from
  quilt-loom/loom/targets_grid.mjs T2 oracle.
- `witness_canon.mjs` — FNV-1a-64 witness idiom, verbatim from
  quilt-loom/loom/targets_fleet.mjs (the fleet's receipt-seal primitive).

The OFF-SPEC variant laws (parameterized life B/S masks, reversi direction
subsets) are rendered deterministically inside `laws.mjs` from mulberry32
seeds — the same deterministic-render doctrine the loom uses for families.
Variant truths are chosen from plausible pools that EXCLUDE the canonical
law, so discovery is a real inference problem, never a triviality.
