# FINDINGS — the Inverse Oracle (2026-09-26)

Run: `run_offline.mjs`, seed 20260926, 14 hidden laws × 3 arms × 6 rations,
234 receipt rows (fnv1a64 chain, `verifyChain` OK). Live leg attempted with
the historical typesafe key → **401 authentication_error** (key apparently
rotated after the standing exposure warning — the leg is receipted, capped,
cache-hygienic, and ready for a fresh key).

## 1. The probe economy is two-sided

First ration achieving **exact ground-truth recovery** (unique surviving
hypothesis AND 1.000 held-out agreement on 200 fresh inputs):

| law | mechanical | structured | adaptive |
|---|---|---|---|
| life.v0..v4 (off-spec B/S masks) | never (≤32) | 24 | **8** |
| reversi.v0..v4 (off-spec ray subsets) | never (≤32) | **8** | 16 |

- On **decomposable mask laws**, adaptivity is a 3× dividend: two generic
  boards pre-pin most (state, neighbor-count) parameters for free, so the
  adaptive arm crafts only the rare leftovers (extreme neighbor counts never
  occur in small random boards). The structured battery re-buys what it
  already knows, in fixed order.
- On **subset-identity laws** the order flips: exhaustive single-ray crafts
  pin the truth immediately (structured, 8), while elimination-first
  adaptive spends 16. When candidates are many and entangled, *isolation*
  beats *inference*.

Design lesson for perception under ration: **know which kind of law you are
facing — decomposable-parameter or identity — before choosing how to
spend.** (A future mind could run both micro-batteries for 2 probes and
route accordingly; that meta-strategy is the real System One move.)

## 2. Mechanical perception has a hard floor

0/10 off-spec laws exactly recovered at ANY ration ≤ 32. Held-out agreement
plateaus ≈ 0.90 — it *plays well* while *knowing nothing exactly*: rare
parameters (e.g. a dead cell with exactly 8 live neighbors, probability
~0.42^8 per position) are unreachable by lucky boards. The sheet-mind leg
makes this visible in-sheet: after 32 random probes the belief cells read
`B37?/S23?`, 4 survivors, confidence 0.889 — honest, and stuck.

Corollary for the poker doctrine: an agent that only samples the opponent's
behavior never recovers the opponent's *law* — it converges to a
behaviorally-similar shadow. "Playing the players" needs crafted probes
(directed bets), not more observation.

## 3. Law class is free; parameters cost

Identification: **14/14 in one probe** via output shape (hex16 → hash
family, "r,c"-list → ray family, number-array → poker, grid → B/S family).
Output type is an unforgeable, unbought signature. All perception budget is
spent on parameters, never on class — so probe rations should be quoted
*AFTER* class identification (as we do).

## 4. Opacity is a verdict

witness_fnv (FNV-1a-64) after 32 probes: held-out agreement 0.000 across all
three arms; the instrument reports `opaque: true` (coverage < 10%, at
chance) instead of a memorizer's overfit "model". Same instrument boundary
the e16 wiring-oracle found for quantum coupling: **a good perception
instrument includes the sentence "this cannot be known from here."**

## 5. Belief refuses lies; the reflex scars them

The sheet's `perceive.step` never overwrites a pinned bit. A channel lie
(birth-at-3 = 0 against a law that pins B3=1) is detected by the reflex
(listener re-explains the frozen witness ledger on every evidence write):
surprise.n 0→1, scar note receipted, belief intact. A corrupt channel costs
one surprise, not a corrupted model. (Listener-action contract note: fired
actions receive `input = {changed, value}` — reading `input.current` is
always undefined. This also fixed a latent shipped bug: arena `lamp.shift`
never fired its flash.)

## 6. System One leg — receipts, a lesson, and a guard

- The historical key 401s (rotated, as recommended). The run is receipted;
  `run_live.mjs` stays capped (≤ 6 real calls), env-keyed, cache-hygienic.
- Hygiene guard born from this run: a LIVE-namespace pass that spends zero
  real calls (mock fallback) now purges its cache — a mock answer must
  never shadow a future real one under the same namespace.
- Mock-fallback observation (honest, pre-registered): even the deterministic
  mock voice, choosing from adaptive's candidate list, recovered the life
  mask exactly in 8 rounds — the candidate list carries the method; the
  judge orders it. On reversi closure the mock fell short (0.855 held-out):
  subset-identity laws are where real System One judgment should pay rent.
  Awaiting a live key to run that comparison for real.

## Provenance & hygiene

- Hidden laws vendored from quilt-loom (`laws/PROVENANCE.md`); off-spec
  truths drawn from pools that exclude the canonical law.
- The jeve seam (`mind.mjs`) was reconstructed from its import contract
  after the original uncommitted implementation was lost in the sanitized
  drop; `jeve/smoke.mjs` is green again (11/11 → SMOKE OK, chain verifies).
  Recorded FINDINGS numbers from the lost build are re-baselined.
- Keys: none in any file of this experiment. `run_live.mjs` reads
  `process.env.TYPESAFE_API_KEY` only.
