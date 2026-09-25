# THE INVERSE ORACLE — arena minds infer bred laws

> voyage: arena-vs-loom. The loom breeds logic; the arena doctrine says the
> edge is *reading the other player's formula*. So we hand a mind a hidden
> law and ration its perception. The question is not "can you play" but
> **"can you know what you are playing against — and what does knowing cost?"**

Part of quilt-arena (E12 lineage). Hidden laws are vendored from the
quilt-loom Divergence Foundry: crowned elites, canonical oracles, and
deterministic off-spec variants (see `laws/PROVENANCE.md`).

## The instrument (3 tiers)

| tier | question | laws |
|---|---|---|
| 1 — identification | is the law CLASS readable for free? | all 14 |
| 2 — discovery | can the PARAMETERS be recovered, and at what probe cost? | reversi.canon + 5 off-spec ray subsets, life.canon + 5 off-spec B/S masks |
| 3 — opacity | does the instrument honestly say "no model" for a hash? | witness_fnv |

Four probe economies compete under identical rations (2/4/8/16/24/32 answers):

- **mechanical** — random valid inputs. No structure.
- **structured** — the textbook battery: every isolating craft in fixed order (B0..B8/S0..S8; ray 0..7).
- **adaptive** — mine every answer for ALL the evidence it carries (one board ≈ 25 parameter witnesses), craft only what is still unknown, extremes first.
- **systone** — adaptive's candidate list, System One judgment picking which probe to buy (1 batched call/round, hard-capped; see `run_live.mjs`).

The mind is a SHEET (`sheet.mjs`): evidence cells, a witness ledger, a
surprise counter with a listener reflex that re-explains its witnesses on
every belief update and **scars on contradiction**. Belief never absorbs a
channel lie — the lie is detected, not propagated.

## Run it

```bash
node smoke.mjs          # 11 deterministic checks, zero live calls
node run_offline.mjs    # full matrix: 14 laws × 3 arms × 6 budgets, receipt-chained
python3 charts.py       # the three receipts, drawn (SuperInstance palette)
TYPESAFE_API_KEY=... node run_live.mjs   # capped System One leg (≤ 6 real calls)
node run_live.mjs       # replay from cache, free
```

## Findings (2026-09-26 run)

See `FINDINGS.md`. Headlines:

1. **Probe economy is two-sided.** Adaptive exactly recovers off-spec life
   masks at ration **8** (structured needs 24 — the fixed battery wastes
   probes on parameters generic boards already pinned). Ray-subset laws
   invert it: structured's exhaustive 8-craft isolation wins at **8**
   (adaptive's elimination converges at 16).
2. **Mechanical perception never recovers ground truth** — 0/10 variants at
   any ration ≤ 32, held-out agreement plateaus ≈ 0.90. Rare parameters
   (a dead cell with 8 live neighbors) are effectively unreachable by luck.
3. **Law CLASS is free**: output shape identifies 14/14 laws in one probe.
   Perception spends on parameters, never on class.
4. **Opacity is a verdict, not a failure**: after 32 probes the witness hash
   yields 0.000 held-out agreement and the instrument reports OPAQUE rather
   than hallucinating structure.
5. **The reflex works**: one channel lie → surprise.n 0→1, scar receipted,
   belief intact (pinned bits are never overwritten by a later lie).

## Files

```
laws.mjs           hidden laws + deterministic off-spec variants + probe seam
laws/              vendored canon laws + PROVENANCE.md
hyp.mjs            probe synthesis, triple/vote mining, hypothesis spaces
strategies.mjs     mechanical / structured / adaptive / systone + MAP + held-out
sheet.mjs          the inference mind as a quilt sheet (evidence, reflex, map)
run_offline.mjs    the matrix + fnv1a64 receipt chain (234 rows, verified)
run_live.mjs       System One leg (cap 6, env key, cache, hygiene guard)
smoke.mjs          11 deterministic checks
charts.py          recovery_curves / recovery_cost / identification_opacity
outputs/           results.json, trace.jsonl, live_results.json, *.png
```

Zero engine patches. The mind is a sheet; the law is a black box; the
receipts are a chain.
