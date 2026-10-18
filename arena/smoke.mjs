// smoke: boot the arena, play one mines duel + one hearts trio, run one set —
// and ASSERT the invariants the arena claims to guarantee.
//
// This is the file CI runs. It is therefore a HARNESS, and a harness must be
// able to fail: every claim below is a real check that throws on violation and
// sets a non-zero exit code, so a broken referee breaks the build instead of
// printing a cheerful log line. (It used to boot four minds, log five lines,
// and exit 0 no matter what — a "check" step that could not fail.)
//
// The check count is DERIVED at runtime by shared/kit.mjs and printed as
// `arena-smoke: N/N checks green`. Nothing here hardcodes N. If you add a
// check, the number moves and the README claim moves with it — run this to see.
//
//   node arena/smoke.mjs

import { Arena, AnalystAI } from './tournament.mjs';
import { MothVault } from './moth.mjs';
import { harness, mulberry32 } from '../shared/kit.mjs';
import { MINES, minesVerify, heartsVerify } from './games.mjs';

const H = harness('arena-smoke');
const ok = H.ok, eq = H.eq;

const vault = new MothVault({ key: null, live: false, cachePath: null });
const arena = new Arena({ vault, analyst: new AnalystAI({ mock: true }) });

const rng = mulberry32(7);
const budget = { left: { p0: 2, p1: 2, p2: 2, p3: 2 }, spent: {}, setNo: 0 };

let mrec, hrec, set;

// -- boot ---------------------------------------------------------------------
await H.check('boot: all four minds answer by seat id', async () => {
  await arena.boot();
  const seats = [];
  for (const id of ['p0', 'p1', 'p2', 'p3']) seats.push(await arena.cell(id, 'id.name'));
  eq(seats, ['p0', 'p1', 'p2', 'p3'], 'four minds booted');
});

// -- G1 MOTHRA: the referee must re-derive, and must reject a doctored record --
await H.check('mines: referee re-derives a clean duel record', async () => {
  mrec = await arena.playMines(['p0', 'p1'], rng, budget, { learn: true });
  ok(minesVerify(mrec) === true, 'clean record must verify');
});

await H.check('mines: referee REJECTS a tampered score', async () => {
  let caught = false;
  try { minesVerify({ ...mrec, scoreA: mrec.scoreA + 7 }); } catch { caught = true; }
  ok(caught, 'a doctored score must not pass the referee');
});

await H.check('mines: every turn is in range and no cell is revealed twice', async () => {
  const seen = new Set();
  for (const t of mrec.turns) {
    ok(t.picked >= 0 && t.picked < MINES.W * MINES.H, `cell ${t.picked} in range`);
    ok(!seen.has(t.picked), `cell ${t.picked} revealed exactly once`);
    seen.add(t.picked);
  }
  ok(seen.size === mrec.turns.length, 'turn count matches distinct cells');
});

// -- G2 WEAVER: same doctrine, different referee ------------------------------
await H.check('hearts: referee re-derives a clean trio record', async () => {
  hrec = await arena.playHearts(['p0', 'p1', 'p2'], rng, budget, { learn: true });
  ok(heartsVerify(hrec) === true, 'clean record must verify');
});

await H.check('hearts: 27 distinct cards dealt, 9 per seat', async () => {
  const all = [...hrec.hands[0], ...hrec.hands[1], ...hrec.hands[2]];
  eq(new Set(all).size, 27, 'cards are distinct across seats');
  eq(hrec.hands.map((h) => h.length), [9, 9, 9], 'hand sizes');
});

await H.check('hearts: referee REJECTS a tampered total', async () => {
  let caught = false;
  try { heartsVerify({ ...hrec, totals: hrec.totals.map((t, i) => (i === 2 ? t - 5 : t)) }); }
  catch { caught = true; }
  ok(caught, 'a doctored total must not pass the referee');
});

// -- the set: budgets, standings, and the novelty rule -------------------------
await H.check('set: runSet completes and ranks all four minds', async () => {
  set = await arena.runSet(1, 2, { learn: true });
  eq(set.standings.map(([a]) => a).sort(), ['p0', 'p1', 'p2', 'p3'], 'all four ranked');
});

await H.check('set: standings are strictly descending by margin', async () => {
  for (let i = 1; i < set.standings.length; i++) {
    ok(set.standings[i][1] < set.standings[i - 1][1], `rank ${i} sits below rank ${i - 1}`);
  }
});

await H.check('budget: no mind spends more perception than the set granted', async () => {
  for (const [id, n] of Object.entries(set.spent)) {
    ok(n <= set.budget, `seat ${id} spent ${n} of ${set.budget}`);
  }
});

await H.check('novelty: every revision is versioned and receipted', async () => {
  const revs = Object.entries(set.revisions);
  ok(revs.length > 0, 'the set produced at least one revision');
  for (const [id, r] of revs) {
    ok(r && typeof r.v === 'number' && r.v >= 1, `seat ${id} revision is versioned`);
    ok(typeof r.hash === 'string' && r.hash.length > 0, `seat ${id} revision is receipted`);
  }
});

console.log(`- mines scoreA ${mrec.scoreA} / scoreB ${mrec.scoreB} over ${mrec.turns.length} turns`);
console.log(`- hearts totals ${hrec.totals.join('/')} over ${hrec.tricks.length} tricks`);
console.log(`- set ${set.setNo} standings ${set.standings.map(([a, m]) => `${a}:${m.toFixed(1)}`).join(' ')}`);

await H.done();
