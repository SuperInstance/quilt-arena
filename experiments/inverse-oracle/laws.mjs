// inverse-oracle/laws.mjs — THE HIDDEN LAWS.
//
// Voyage: arena-vs-loom. The loom breeds logic; the arena's doctrine says the
// edge is reading the OTHER player's formula. So we hand a mind a black-box
// LAW and ration its probes. Three instrument tiers:
//
//   canonical  — a crowned loom elite or reference oracle (behavior = the
//                public spec). The mind must IDENTIFY the law class.
//   variant    — an off-spec law rendered from a seed (life B/S masks that
//                are NOT B3/S23, reversi ray subsets that are NOT all-8). The
//                mind must DISCOVER the parameters. Truth is hidden.
//   opaque     — a witness hash. No instrument may infer it; the honest
//                verdict is "opaque", not a hallucinated model.
//
// The mind NEVER imports this module's solvers — the harness runs them and
// hands back probe answers only. describe() exists for the post-run report.

import { mulberry32 } from '../../shared/kit.mjs';
import * as reversiCanon from './laws/reversi_canon.mjs';
import * as handCanon from './laws/hand_canon.mjs';
import * as lifeCanon from './laws/life_canon.mjs';
import * as witnessCanon from './laws/witness_canon.mjs';

export const DIRS8 = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

// ── parameterized (off-spec) solvers ─────────────────────────────────────────

// life under a general B/S mask: b[k] = a dead cell with k live neighbors is
// born; s[k] = a live cell with k neighbors survives. Dead borders.
export function lifeMaskSolve(mask) {
  return function solve(input) {
    const g = input.grid, H = g.length, W = g[0].length;
    const out = g.map(row => row.slice());
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      let n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= H || nc >= W) continue;
        n += g[nr][nc];
      }
      out[r][c] = g[r][c] ? (mask.s[n] ? 1 : 0) : (mask.b[n] ? 1 : 0);
    }
    return out;
  };
}

// reversi flips under a restricted active-direction subset.
export function reversiDirsSolve(dirs) {
  const key = JSON.stringify(dirs);
  return function solve(input) {
    const g = input.grid, opp = input.player === 1 ? 2 : 1;
    const DIRS = JSON.parse(key);
    const flips = new Set();
    for (const [dr, dc] of DIRS) {
      const run = [];
      let r = input.r + dr, c = input.c + dc;
      while (r >= 0 && c >= 0 && r < g.length && c < g[0].length && g[r][c] === opp) {
        run.push([r, c]); r += dr; c += dc;
      }
      if (run.length && r >= 0 && c >= 0 && r < g.length && c < g[0].length && g[r][c] === input.player)
        run.forEach(([fr, fc]) => flips.add(fr + ',' + fc));
    }
    const out = [...flips]; out.sort(); return out;
  };
}

// ── truth pools (variant laws are drawn from these; canonical excluded) ──────

// plausible life masks: perturb Conway. Pool entries are {b:[..9 bool], s:[..9]}.
// Stored as count-sets for readable receipts.
const LIFE_POOL = [
  { id: 'B34/S23',  b: [3, 4],          s: [2, 3] },          // highlife-adjacent
  { id: 'B36/S23',  b: [3, 6],          s: [2, 3] },          // day-and-night-ish
  { id: 'B3/S238',  b: [3],             s: [2, 3, 8] },       // crowded survival
  { id: 'B37/S23',  b: [3, 7],          s: [2, 3] },
  { id: 'B356/S23', b: [3, 5, 6],       s: [2, 3] },
  { id: 'B2/S23',   b: [2],             s: [2, 3] },          // seedier genesis
  { id: 'B3/S45',   b: [3],             s: [4, 5] },          // long-lived
];
const maskOf = (sets) => ({
  b: Array.from({ length: 9 }, (_, k) => (sets.b.includes(k) ? 1 : 0)),
  s: Array.from({ length: 9 }, (_, k) => (sets.s.includes(k) ? 1 : 0)),
});
export const maskId = (m) =>
  'B' + m.b.map((x, k) => (x ? k : null)).filter((x) => x !== null).join('') +
  '/S' + m.s.map((x, k) => (x ? k : null)).filter((x) => x !== null).join('');

// plausible reversi subsets: 5..7 of the 8 rays (never all 8, never 0..4 —
// below 5 the law feels dead and above 5 probes the boundary honestly).
const DIR_POOL = (() => {
  const pool = [];
  for (let drop = 0; drop < 8; drop++) {
    for (let drop2 = drop + 1; drop2 < 8; drop2++) {
      pool.push(DIRS8.filter((_, i) => i !== drop && i !== drop2)); // 6 rays
    }
  }
  for (let drop = 0; drop < 8; drop++) pool.push(DIRS8.filter((_, i) => i !== drop)); // 7 rays
  return pool;
})();
export const dirsId = (dirs) => dirs.length + 'ray:' + DIRS8.map((d) => (dirs.some((e) => e[0] === d[0] && e[1] === d[1]) ? 1 : 0)).join('');

// ── input generators (satisfiable by construction — the forge contract) ─────

function genLife(R) {
  const H = 4 + Math.floor(R() * 3), W = 4 + Math.floor(R() * 3);
  return { grid: Array.from({ length: H }, () => Array.from({ length: W }, () => (R() < 0.42 ? 1 : 0))) };
}
function genReversi(R) {
  for (let tries = 0; tries < 300; tries++) {
    const rows = 4 + Math.floor(R() * 3), cols = 4 + Math.floor(R() * 3);
    const g = Array.from({ length: rows }, () => Array.from({ length: cols }, () => {
      const x = R(); return x < 0.34 ? 1 : x < 0.68 ? 2 : 0;
    }));
    const player = R() < 0.5 ? 1 : 2, opp = player === 1 ? 2 : 1;
    const empties = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (g[r][c] === 0) empties.push([r, c]);
    if (!empties.length) continue;
    const [r, c] = empties[Math.floor(R() * empties.length)];
    let legal = false;
    for (const [dr, dc] of DIRS8) {
      let rr = r + dr, cc = c + dc, seen = false;
      while (rr >= 0 && cc >= 0 && rr < rows && cc < cols && g[rr][cc] === opp) { seen = true; rr += dr; cc += dc; }
      if (seen && rr >= 0 && cc >= 0 && rr < rows && cc < cols && g[rr][cc] === player) { legal = true; break; }
    }
    if (legal) return { grid: g, r, c, player };
  }
  return { grid: [[1, 2, 0], [0, 1, 2], [2, 0, 1]], r: 0, c: 2, player: 1 };
}
function genHand(R) {
  const RANKS = '23456789TJQKA', SUITS = 'shdc';
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s);
  const cards = [];
  for (let i = 0; i < 5; i++) {
    const k = Math.floor(R() * deck.length);
    cards.push(deck.splice(k, 1)[0]);
  }
  return { cards };
}
function genWitness(R) {
  const alpha = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const n = 3 + Math.floor(R() * 12);
  let t = '';
  for (let i = 0; i < n; i++) t += alpha[Math.floor(R() * alpha.length)];
  return { text: t };
}

// ── canonicalizers (probe answers are compared through these) ────────────────
const canonGrid = (out) => JSON.stringify((out || []).map((row) => row.join('')));
const canonList = (out) => JSON.stringify([...(out || [])].map(String).sort());
const canonHand = (o) => JSON.stringify([o.cat, ...(o.kickers || [])]);
const canonHex = (o) => String(o).toLowerCase();

// ── the library ──────────────────────────────────────────────────────────────

export function buildLaws({ lifeSeeds = [11, 22, 33, 44, 55], dirSeeds = [7, 17, 27, 37, 47] } = {}) {
  const laws = [];

  laws.push({
    id: 'reversi.canon', tier: 'canonical', family: 'reversi',
    truth: { dirs: 'all-8' },
    solve: reversiCanon.solve, canon: canonList, genInput: genReversi,
  });

  dirSeeds.forEach((seed, i) => {
    const dirs = DIR_POOL[Math.floor(mulberry32(seed)() * DIR_POOL.length)];
    laws.push({
      id: `reversi.v${i}`, tier: 'variant', family: 'reversi-variant',
      truth: { dirs: dirsId(dirs), k: dirs.length },
      solve: reversiDirsSolve(dirs), canon: canonList, genInput: genReversi,
    });
  });

  laws.push({
    id: 'life.canon', tier: 'canonical', family: 'life',
    truth: { mask: 'B3/S23' },
    solve: lifeCanon.solve, canon: canonGrid, genInput: genLife,
  });

  lifeSeeds.forEach((seed, i) => {
    const sets = LIFE_POOL[Math.floor(mulberry32(seed)() * LIFE_POOL.length)];
    const mask = maskOf(sets);
    laws.push({
      id: `life.v${i}`, tier: 'variant', family: 'life-variant',
      truth: { mask: maskId(mask), sets: sets.id },
      solve: lifeMaskSolve(mask), canon: canonGrid, genInput: genLife,
    });
  });

  laws.push({
    id: 'hand.canon', tier: 'known', family: 'hand',
    truth: { spec: 'public poker table' },
    solve: handCanon.solve, canon: canonHand, genInput: genHand,
  });

  laws.push({
    id: 'witness.canon', tier: 'opaque', family: 'witness',
    truth: { fnv: '1a-64' },
    solve: witnessCanon.solve, canon: canonHex, genInput: genWitness,
  });

  // describe() is for the post-run report ONLY — never exposed to the mind.
  for (const L of laws) {
    L.describe = () => JSON.stringify(L.truth);
    L.run = (input) => L.solve(input); // the black-box seam
  }
  return laws;
}

// probe a law: the ONLY channel the mind gets. Returns the canonical answer.
export function probe(law, input) {
  return law.canon(law.run(input));
}
