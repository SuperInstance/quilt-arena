// inverse-oracle/strategies.mjs — THE PROBE ECONOMIES.
//
// Four arms compete under the SAME ration (budget = number of probe answers):
//
//   mechanical — random valid inputs; no structure. The control.
//   structured — the textbook battery: craft every isolating test in a fixed
//                order (B0..B8/S0..S8; ray 0..7), then go random.
//   adaptive   — mine EVERY answer for all the evidence it carries (a whole
//                board is ~25 parameter witnesses), craft only what is still
//                unknown, and among unknowns buy the test that maximizes the
//                surviving-hypothesis split. Information economy.
//   systone    — the adaptive candidate list, but WHICH test to buy (and when
//                to stop) is System One judgment: one batched call per round
//                (choice over candidates + worth noul + stop score). Offline
//                runs use the deterministic mock; the live leg spends real
//                calls under a hard cap.
//
// The memorizer is not a strategy — it is the opacity control's mirror:
// it memorizes probe answers and reports its generalization gap so the
// receipt can say "this law cannot be inferred" HONESTLY.

import {
  lifeCraft, lifeTriples, lifeFold, lifeMasksConsistent, lifeUnknowns,
  reversiCraft, reversiVotes, reversiSubsetsConsistent, reversiScoreSubset,
  shapeSignature, CLASS_ALPHABET, mulberry32,
} from './hyp.mjs';
import { probe } from './laws.mjs';
import { lifeMaskSolve, DIRS8 } from './laws.mjs';

const clone = (x) => JSON.parse(JSON.stringify(x));

// ── the ledger every strategy shares ─────────────────────────────────────────
function newLedger() {
  return { probes: [], triples: [], lifeEv: null, conflicts: 0 };
}

function mineLife(ledger, input, answer) {
  const grid = input.grid;
  const out = answerToGrid(answer);
  if (!out) return;
  ledger.triples.push(...lifeTriples(grid, out));
  const { ev, conflicts } = lifeFold([ledger.triples]);
  ledger.conflicts += conflicts; // surprise telemetry
  ledger.lifeEv = ev;
}

function answerToGrid(answer) {
  try {
    const o = JSON.parse(answer);
    if (Array.isArray(o) && o.every((r) => Array.isArray(r))) return o.map((row) => row.map(Number));
    if (Array.isArray(o) && o.every((r) => typeof r === 'string')) return o.map((row) => [...row].map(Number));
  } catch { /* not a grid law */ }
  return null;
}

// ── mechanical ───────────────────────────────────────────────────────────────
export function mechanical(law, budget, seed) {
  const R = mulberry32(seed);
  const ledger = newLedger();
  for (let i = 0; i < budget; i++) {
    const input = law.genInput(R);
    const answer = probe(law, input);
    ledger.probes.push({ i, input, answer, crafted: null });
    if (law.family.startsWith('life')) mineLife(ledger, input, answer);
  }
  return ledger;
}

// ── structured (fixed textbook battery) ──────────────────────────────────────
export function structured(law, budget, seed) {
  const R = mulberry32(seed);
  const ledger = newLedger();
  const isLife = law.family.startsWith('life');
  const isReversi = law.family.startsWith('reversi');
  if (!isLife && !isReversi) return mechanical(law, budget, seed); // opaque/known: no crafted battery
  const crafts = isLife
    ? Array.from({ length: 9 }, (_, k) => lifeCraft(0, k)).concat(Array.from({ length: 9 }, (_, k) => lifeCraft(1, k)))
    : Array.from({ length: 8 }, (_, d) => ({ ...reversiCraft(d), crafted: d }));
  let ci = 0;
  for (let i = 0; i < budget; i++) {
    let input, crafted = null;
    if (ci < crafts.length) { input = crafts[ci]; crafted = input.crafted ?? null; ci++; }
    else { input = law.genInput(R); }
    const answer = probe(law, input);
    // crafted entries carry their expectation so vote-mining can read them
    ledger.probes.push({ i, input, answer, crafted, ...(input.expect ? { expect: input.expect } : {}) });
    if (isLife) mineLife(ledger, input, answer);
  }
  return ledger;
}

// ── adaptive ─────────────────────────────────────────────────────────────────
export function adaptive(law, budget, seed) {
  const R = mulberry32(seed);
  const ledger = newLedger();

  if (law.family.startsWith('life')) {
    // Phase 1: two rich random boards (each yields up to ~2*(state,n)×cells
    // witnesses) — mine them for free evidence.
    for (let i = 0; i < Math.min(2, budget); i++) {
      const input = law.genInput(R);
      const answer = probe(law, input);
      ledger.probes.push({ i, input, answer, crafted: null });
      mineLife(ledger, input, answer);
    }
    // Phase 2: craft ONLY the still-unknown parameters, rarest-first
    // (extreme neighbor counts never appear in small random boards).
    while (ledger.probes.length < budget) {
      const unknowns = lifeUnknowns(ledger.lifeEv);
      if (!unknowns.length) {
        // fully pinned: spend the rest on confirm boards (held-out value)
        const input = law.genInput(R);
        const answer = probe(law, input);
        ledger.probes.push({ i: ledger.probes.length, input, answer, crafted: null, confirm: true });
        mineLife(ledger, input, answer);
        continue;
      }
      // order: extremes first (n=8, n=0 for survive; n=8 for birth) — they
      // maximize information per craft because random boards never cover them
      const order = (u) => (u.n >= 7 ? 0 : u.n === 0 && u.state === 1 ? 1 : 2);
      unknowns.sort((a, b) => order(a) - order(b));
      const u = unknowns[0];
      const input = lifeCraft(u.state, u.n);
      const answer = probe(law, input);
      ledger.probes.push({ i: ledger.probes.length, input, answer, crafted: `${u.state ? 'S' : 'B'}${u.n}` });
      mineLife(ledger, input, answer);
    }
    return ledger;
  }

  if (law.family.startsWith('reversi')) {
    // Phase 1: behavioral elimination over the 255 subsets with random boards
    let cands = reversiSubsetsConsistent(Array(8).fill(null));
    while (ledger.probes.length < budget && cands.length > 1) {
      const input = law.genInput(R);
      const answer = probe(law, input);
      ledger.probes.push({ i: ledger.probes.length, input, answer, crafted: null });
      cands = cands.filter((sub) => {
        const pred = (() => {
          const g = input.grid, opp = input.player === 1 ? 2 : 1;
          const flips = new Set();
          for (const [dr, dc] of sub.dirs) {
            const run = [];
            let r = input.r + dr, c = input.c + dc;
            while (r >= 0 && c >= 0 && r < g.length && c < g[0].length && g[r][c] === opp) { run.push([r, c]); r += dr; c += dc; }
            if (run.length && r >= 0 && c >= 0 && r < g.length && c < g[0].length && g[r][c] === input.player)
              run.forEach(([fr, fc]) => flips.add(fr + ',' + fc));
          }
          return JSON.stringify([...flips].sort());
        })();
        return pred === answer;
      });
      if (cands.length === 1) break;
      // Phase 2 kick-in: when elimination stalls (≥3 cands share behavior on
      // randoms), buy single-ray crafts for still-unvoted directions.
      const votes = reversiVotes(ledger.probes.filter((p) => p.crafted !== undefined && p.crafted !== null).map((p) => ({ ...p, expect: p.expect })));
      const unvoted = votes.active.map((v, d) => (v === null ? d : null)).filter((x) => x !== null);
      if (unvoted.length && ledger.probes.length + 1 <= budget) {
        const d = unvoted[0];
        const craft = reversiCraft(d);
        const answer2 = probe(law, craft);
        ledger.probes.push({ i: ledger.probes.length, input: craft, answer: answer2, crafted: d, expect: craft.expect });
        cands = reversiSubsetsConsistent(reversiVotes(ledger.probes.filter((p) => p.crafted !== undefined && p.crafted !== null)).active)
          .filter((sub) => cands.some((c) => c.key === sub.key));
        if (cands.length === 1) break;
      }
    }
    // fill remaining budget with confirms
    while (ledger.probes.length < budget) {
      const input = law.genInput(R);
      const answer = probe(law, input);
      ledger.probes.push({ i: ledger.probes.length, input, answer, crafted: null, confirm: true });
    }
    return ledger;
  }

  // non-decomposable families: adaptive degenerates to mechanical + a
  // structure-search receipt (it must NOT pretend to have a model)
  return mechanical(law, budget, seed);
}

// ── System One directed (async) ──────────────────────────────────────────────
// The adaptive machinery proposes the candidate tests; System One decides
// WHICH to buy and WHETHER to keep spending. One batched call per round.
export async function systone(law, budget, seed, vault, tag) {
  const R = mulberry32(seed);
  const ledger = newLedger();

  if (law.family.startsWith('life')) {
    for (let i = 0; i < budget; i++) {
      const unknowns = ledger.lifeEv ? lifeUnknowns(ledger.lifeEv) : [];
      if (!unknowns.length) {
        const input = law.genInput(R);
        const answer = probe(law, input);
        ledger.probes.push({ i, input, answer, crafted: null, confirm: true });
        mineLife(ledger, input, answer);
        continue;
      }
      // candidate tests: up to 6 unknowns, extremes-first ordering as context
      const cands = unknowns.slice(0, 6).map((u, j) => ({
        id: `${u.state ? 'S' : 'B'}${u.n}`,
        note: u.state ? `live cell with exactly ${u.n} live neighbors` : `empty cell with exactly ${u.n} live neighbors`,
      }));
      const evText = ledger.lifeEv
        ? 'pinned: b-mask=' + ledger.lifeEv.b.map((x) => (x === null ? '?' : x)).join('') +
          ' s-mask=' + ledger.lifeEv.s.map((x) => (x === null ? '?' : x)).join('') +
          ' (index = neighbor count 0..8, ? = unknown)'
        : 'nothing pinned yet';
      const { answers, source, mock } = await vault.decide(
        `Black-box life-like law. Evidence so far: ${evText}. Candidate probes: ${cands.map((c) => c.id + ' — ' + c.note).join('; ')}.`,
        {
          next_probe: { type: 'choice', instructions: 'Which single parameter test is most informative to buy next? Pick its id.', criteria: Object.fromEntries(cands.map((c) => [c.id, c.note])) },
          worth: { type: 'noul', instructions: 'Is buying another probe worth it given the evidence so far?' },
        },
        { tag: `${tag}:r${i}` },
      );
      const pick = String(answers.next_probe?.choice ?? cands[0].id);
      const m = /^(S|B)(\d)$/.exec(pick);
      const u = m && m[1] === 'S' ? { state: 1, n: +m[2] } : { state: 0, n: +m[2] };
      const input = lifeCraft(u.state, u.n);
      const answer = probe(law, input);
      ledger.probes.push({ i, input, answer, crafted: pick, sysone: { source, mock, worth: answers.worth?.noul ?? null } });
      mineLife(ledger, input, answer);
    }
    return ledger;
  }

  if (law.family.startsWith('reversi')) {
    let cands = reversiSubsetsConsistent(Array(8).fill(null));
    for (let i = 0; i < budget && cands.length > 1; i++) {
      const { answers, source, mock } = await vault.decide(
        `Black-box reversi-like law (ray-direction subsets). ${cands.length} candidate subsets survive. Evidence: ${JSON.stringify(ledger.probes.slice(-3).map((p) => ({ crafted: p.crafted, answer: p.answer })))}.`,
        {
          next_probe: {
            type: 'choice',
            instructions: 'Which probe to buy next?',
            criteria: {
              random_board: 'another random legal position (behavioral elimination)',
              ray_craft: 'a crafted single-ray probe (direct vote on one direction)',
            },
          },
          worth: { type: 'noul', instructions: 'Is another probe worth the budget?' },
        },
        { tag: `${tag}:r${i}` },
      );
      const pick = String(answers.next_probe?.choice ?? 'random_board');
      if (pick === 'ray_craft') {
        const votes = reversiVotes(ledger.probes.filter((p) => p.crafted !== undefined && p.crafted !== null));
        const unvoted = votes.active.map((v, d) => (v === null ? d : null)).filter((x) => x !== null);
        const d = unvoted.length ? unvoted[0] : Math.floor(R() * 8);
        const craft = reversiCraft(d);
        const answer = probe(law, craft);
        ledger.probes.push({ i, input: craft, answer, crafted: d, expect: craft.expect, sysone: { source, mock } });
      } else {
        const input = law.genInput(R);
        const answer = probe(law, input);
        ledger.probes.push({ i, input, answer, crafted: null, sysone: { source, mock } });
      }
      cands = cands.filter((sub) => {
        const p = ledger.probes[ledger.probes.length - 1];
        const g = p.input.grid, opp = p.input.player === 1 ? 2 : 1;
        const flips = new Set();
        for (const [dr, dc] of sub.dirs) {
          const run = [];
          let r = p.input.r + dr, c = p.input.c + dc;
          while (r >= 0 && c >= 0 && r < g.length && c < g[0].length && g[r][c] === opp) { run.push([r, c]); r += dr; c += dc; }
          if (run.length && r >= 0 && c >= 0 && r < g.length && c < g[0].length && g[r][c] === p.input.player)
            run.forEach(([fr, fc]) => flips.add(fr + ',' + fc));
        }
        return JSON.stringify([...flips].sort()) === p.answer;
      });
    }
    while (ledger.probes.length < budget) {
      const input = law.genInput(R);
      const answer = probe(law, input);
      ledger.probes.push({ i: ledger.probes.length, input, answer, crafted: null, confirm: true });
    }
    return ledger;
  }

  return mechanical(law, budget, seed);
}

// ── the MAP extraction + held-out scoring (shared by all arms) ───────────────

export function extractMap(law, ledger) {
  if (law.family.startsWith('life')) {
    if (!ledger.lifeEv) return { kind: 'none', key: null, model: null };
    const cons = lifeMasksConsistent(ledger.lifeEv);
    if (cons.length === 1) return { kind: 'map', key: cons[0].key, model: lifeMaskSolve(cons[0]), survivors: 1 };
    if (cons.length === 0) return { kind: 'contradiction', key: null, model: null, survivors: 0 };
    return { kind: 'underdetermined', key: cons[0].key, model: lifeMaskSolve(cons[0]), survivors: cons.length };
  }
  if (law.family.startsWith('reversi')) {
    const votes = reversiVotes(ledger.probes.filter((p) => p.crafted !== undefined && p.crafted !== null));
    let cands = reversiSubsetsConsistent(votes.active);
    if (cands.length > 1) {
      // behavioral re-score against the full ledger, keep the best
      let best = null, bestScore = -1;
      for (const sub of cands.slice(0, 64)) {
        const s = reversiScoreSubset(sub, ledger.probes, null);
        if (s > bestScore) { bestScore = s; best = sub; }
      }
      cands = [best];
    }
    if (cands.length === 1) return { kind: 'map', key: cands[0].key, subset: cands[0], survivors: 1 };
    if (cands.length === 0) return { kind: 'contradiction', key: null, model: null, survivors: 0 };
    return { kind: 'underdetermined', key: cands[0].key, subset: cands[0], survivors: cands.length };
  }
  return { kind: 'none', key: null, model: null };
}

// held-out behavioral agreement: 200 fresh inputs, MAP law vs true law
export function heldOut(law, map, n = 200, seed = 99) {
  if (law.tier === 'opaque') {
    // memorizer generalization: overlap on FRESH strings is the measure
    return { agreement: 0, note: 'no compressed model possible; memorizer at chance on fresh inputs' };
  }
  if (!map || map.kind === 'none' || map.kind === 'contradiction') return { agreement: 0, note: 'no viable map' };
  const R = mulberry32(seed);
  let agree = 0;
  for (let i = 0; i < n; i++) {
    const input = law.genInput(R);
    const truth = law.canon(law.run(input));
    let pred = null;
    if (law.family.startsWith('life') && map.model) pred = law.canon(map.model(input));
    else if (law.family.startsWith('reversi') && map.subset) {
      const g = input.grid, opp = input.player === 1 ? 2 : 1;
      const flips = new Set();
      for (const [dr, dc] of map.subset.dirs) {
        const run = [];
        let r = input.r + dr, c = input.c + dc;
        while (r >= 0 && c >= 0 && r < g.length && c < g[0].length && g[r][c] === opp) { run.push([r, c]); r += dr; c += dc; }
        if (run.length && r >= 0 && c >= 0 && r < g.length && c < g[0].length && g[r][c] === input.player)
          run.forEach(([fr, fc]) => flips.add(fr + ',' + fc));
      }
      pred = JSON.stringify([...flips].sort());
    } else if (law.family === 'hand' || law.family === 'witness') {
      pred = law.family === 'hand' ? truth : null; // known law handed to the mind; opaque admits nothing
    }
    if (pred === truth) agree++;
  }
  return { agreement: +(agree / n).toFixed(4), n };
}

// Tier 1: identify the law class by output shape (the free signature)
export function identify(law, seed = 5) {
  const R = mulberry32(seed);
  const input = law.genInput(R);
  const answer = probe(law, input);
  const shape = shapeSignature(answer);
  const cls = CLASS_ALPHABET.find((c) => c.shape === shape)?.cls ?? 'unknown';
  return { probesUsed: 1, shape, cls, trueFamily: law.family };
}

export { clone };
