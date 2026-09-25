// inverse-oracle/hyp.mjs — HYPOTHESIS MACHINERY.
//
// What the mind may KNOW a priori (this is its instrument, not the law):
//   - the FAMILY ALPHABET: "life-like laws are B/S masks over 9 neighbor
//     counts; reversi-like laws are ray-direction subsets; hand-like laws
//     are the public poker table; hash-like laws exist and are opaque."
//   - probe SYNTHESIS: how to craft a board that isolates one parameter.
//     This is the scientific method as code: isolate, perturb, measure.
// What it may NOT know: which parameters the hidden law actually uses.
//
// Evidence model (the decomposable decoder): every probe answer, whatever
// the strategy that chose it, is mined for (state, n -> out) triples for
// life-laws and per-direction flip votes for reversi-laws. A crafted probe
// and a random board feed the SAME evidence ledger — strategies differ only
// in WHICH inputs they buy with the rationed budget.

import { DIRS8 } from './laws.mjs';
import { mulberry32 } from '../../shared/kit.mjs';

// ── triple mining: (state, neighborCount) -> output bit, per cell ────────────
export function lifeTriples(grid, out) {
  const H = grid.length, W = grid[0].length;
  const seen = new Map(); // `${state}|${n}` -> out (first witness wins; conflict logged by caller)
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= H || nc >= W) continue;
      n += grid[nr][nc];
    }
    const key = grid[r][c] + '|' + n;
    if (!seen.has(key)) seen.set(key, out[r][c]);
  }
  return [...seen.entries()].map(([k, o]) => {
    const [state, n] = k.split('|').map(Number);
    return { state, n, out: o };
  });
}

// ── crafted life probes: isolate (state, n) exactly ──────────────────────────
// A 3x3 board: center cell in `state`, exactly k of the 8 ring cells live.
// Only the center cell's answer is read → clean isolation of that parameter.
export function lifeCraft(state, n) {
  const ring = [...DIRS8];
  // deterministic spread of the k live cells around the ring
  const liveSet = new Set();
  for (let i = 0; i < n; i++) liveSet.add(i);
  const grid = [[0, 0, 0], [0, state, 0], [0, 0, 0]];
  liveSet.forEach((i) => { grid[1 + ring[i][0]][1 + ring[i][1]] = 1; });
  return { grid, target: { r: 1, c: 1 } };
}

// ── crafted reversi probes: isolate one ray direction ────────────────────────
// Board where ONLY direction d offers a legal flip: an opp run along d that
// terminates in own piece; every other ray from the placement is blocked by
// edge/empty. A flip set containing the run cells ⇒ direction d is active.
export function reversiCraft(dIdx) {
  const [dr, dc] = DIRS8[dIdx];
  const rows = 7, cols = 7, g = Array.from({ length: rows }, () => Array(cols).fill(0));
  const r = 3, c = 3, player = 1, opp = 2;
  // seal all other rays with empties/border by placing opp only along d
  let rr = r + dr, cc = c + dc;
  const run = [];
  for (let k = 0; k < 2; k++) { g[rr][cc] = opp; run.push([rr, cc]); rr += dr; cc += dc; }
  g[rr][cc] = player; // the terminator — legal along d
  // block every other direction with an empty ring (empty already blocks)
  return { grid: g, r, c, player, expect: run.map(([a, b]) => `${a},${b}`) };
}

// ── hypothesis spaces ────────────────────────────────────────────────────────

export const LIFE_MASKS = (() => {
  const out = [];
  for (let b = 0; b < 512; b++) for (let s = 0; s < 512; s++) {
    const bm = Array.from({ length: 9 }, (_, k) => (b >> k) & 1);
    const sm = Array.from({ length: 9 }, (_, k) => (s >> k) & 1);
    // skip masks with no births (dead law) and the ones that never survive
    if (!bm.some(Boolean) && !sm.some(Boolean)) continue;
    out.push({ b: bm, s: sm, key: 'B' + bm.map((x, k) => (x ? k : null)).filter((x) => x !== null).join('') + '/S' + sm.map((x, k) => (x ? k : null)).filter((x) => x !== null).join('') });
  }
  return out;
})();
export const lifeMaskKey = (m) => m.key;

export const REVERSI_SUBSETS = (() => {
  const out = [];
  for (let m = 1; m < 256; m++) {
    const dirs = DIRS8.filter((_, i) => (m >> i) & 1);
    out.push({ dirs, mask: m, key: dirs.map((d) => DIRS8.findIndex((e) => e[0] === d[0] && e[1] === d[1])).join('') });
  }
  return out;
})();

// ── life decode + consistency ────────────────────────────────────────────────

// Fold triples into a partial evidence map: {birth:{k:0|1}, survive:{k:0|1}}.
// Returns { ev, conflicts } — conflicts are SURPRISE (probe contradicted an
// already-pinned bit; impossible for a true law, expected for… nothing. It is
// the reflex tripwire).
export function lifeFold(triplesList) {
  const ev = { b: Array(9).fill(null), s: Array(9).fill(null) };
  let conflicts = 0;
  for (const triples of triplesList) {
    for (const t of triples) {
      const slot = t.state === 1 ? ev.s : ev.b;
      if (slot[t.n] === null) slot[t.n] = t.out;
      else if (slot[t.n] !== t.out) conflicts++;
    }
  }
  return { ev, conflicts };
}

export function lifeMasksConsistent(ev) {
  const out = [];
  for (const m of LIFE_MASKS) {
    let ok = true;
    for (let k = 0; k < 9 && ok; k++) {
      if (ev.b[k] !== null && m.b[k] !== ev.b[k]) ok = false;
      if (ev.s[k] !== null && m.s[k] !== ev.s[k]) ok = false;
    }
    if (ok) out.push(m);
  }
  return out;
}

// which (state, n) parameters are still unpinned?
export function lifeUnknowns(ev) {
  const out = [];
  for (let k = 0; k < 9; k++) {
    if (ev.b[k] === null) out.push({ state: 0, n: k });
    if (ev.s[k] === null) out.push({ state: 1, n: k });
  }
  return out;
}

// ── reversi decode + scoring ────────────────────────────────────────────────
// Per-probe votes: for each candidate subset, predict the flip set; subsets
// that mispredict are eliminated. Crafted single-ray probes give a DIRECT
// vote (run cells flipped ⇒ d active; not flipped ⇒ d inactive) but only
// when the probe was single-ray-clean (the mind knows its own crafts).
export function reversiVotes(probeList) {
  // probeList: [{input, answer, crafted?: dIdx|undefined}]
  const active = Array(8).fill(null);
  let conflicts = 0;
  for (const p of probeList) {
    if (p.crafted !== undefined && p.crafted !== null) {
      const runCells = p.expect || [];
      const ansArr = typeof p.answer === 'string' ? JSON.parse(p.answer) : p.answer;
      const flipped = new Set(ansArr);
      if (runCells.length) {
        const anyFlipped = runCells.some((cell) => flipped.has(cell));
        if (active[p.crafted] === null) active[p.crafted] = anyFlipped ? 1 : 0;
        else if (active[p.crafted] !== (anyFlipped ? 1 : 0)) conflicts++;
      }
    }
  }
  return { active, conflicts };
}

export function reversiSubsetsConsistent(active) {
  return REVERSI_SUBSETS.filter((s) => {
    for (let d = 0; d < 8; d++) if (active[d] !== null && s.dirs.some((x) => DIRS8[d][0] === x[0] && DIRS8[d][1] === x[1]) !== Boolean(active[d])) return false;
    return true;
  });
}

// full behavioral scoring of reversi subsets against a probe ledger
export function reversiScoreSubset(sub, probeList, reversiSolve) {
  let ok = 0;
  for (const p of probeList) {
    const pred = (() => {
      const g = p.input.grid, opp = p.input.player === 1 ? 2 : 1;
      const flips = new Set();
      for (const [dr, dc] of sub.dirs) {
        const run = [];
        let r = p.input.r + dr, c = p.input.c + dc;
        while (r >= 0 && c >= 0 && r < g.length && c < g[0].length && g[r][c] === opp) { run.push([r, c]); r += dr; c += dc; }
        if (run.length && r >= 0 && c >= 0 && r < g.length && c < g[0].length && g[r][c] === p.input.player)
          run.forEach(([fr, fc]) => flips.add(fr + ',' + fc));
      }
      return [...flips].sort();
    })();
    if (JSON.stringify(pred) === p.answer) ok++;
  }
  return ok;
}

// ── identification library (Tier 1) ─────────────────────────────────────────
// The mind knows the CLASS alphabet and each class's output SHAPE signature.
// One crafted discriminating probe per signature axis; identify = argmax.
export const CLASS_ALPHABET = [
  { cls: 'life',     shape: 'grid',    hint: 'binary grid in, binary grid out (B/S mask family)' },
  { cls: 'reversi',  shape: 'list',    hint: 'grid+move in, "r,c" list out (ray-subset family)' },
  { cls: 'hand',     shape: 'poker',   hint: '5 card strings in, {cat,kickers} out — the PUBLIC poker table' },
  { cls: 'witness',  shape: 'hex16',   hint: 'text in, 16-hex-char string out — known opaque family' },
];

export function shapeSignature(answer) {
  let o;
  try { o = JSON.parse(answer); } catch { o = answer; }
  if (typeof o === 'string') return /^[0-9a-f]{16}$/.test(o) ? 'hex16' : 'unknown';
  if (Array.isArray(o) && o.every((x) => typeof x === 'string' && /^[0-7],[0-7]$/.test(x))) return 'list';
  if (Array.isArray(o) && o.every((r) => Array.isArray(r))) return 'grid';
  if (Array.isArray(o) && o.every((r) => typeof r === 'string')) return 'grid';
  if (Array.isArray(o) && o.every((x) => typeof x === 'number')) return 'poker';
  if (o && typeof o === 'object' && 'cat' in o) return 'poker';
  return 'unknown';
}

// ── opacity detector (the honest instrument boundary) ────────────────────────
// A law is reported opaque when the best structured family explains nothing:
// no compressed hypothesis is even IN the right shape (answers are 16-hex
// strings from a text input, no (state,n) or ray structure to mine). We make
// this formal: mine triples / votes / any lattice — if the mined evidence
// covers < 10% of the shape-relevant parameter space AND the memorizer's
// held-out agreement is at chance, verdict = opaque.
export function opacityVerdict({ minedBits, paramSpaceSize, heldOutAgreement, chance }) {
  const coverage = minedBits / Math.max(1, paramSpaceSize);
  const atChance = heldOutAgreement <= chance * 4;
  return { opaque: coverage < 0.10 && atChance, coverage: +coverage.toFixed(4), atChance };
}

export { mulberry32 };
