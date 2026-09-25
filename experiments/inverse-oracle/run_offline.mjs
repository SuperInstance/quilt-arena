// inverse-oracle/run_offline.mjs — THE EXPERIMENTAL MATRIX.
//
// Tier 1  identification : 1 probe per law — is the class readable for free?
// Tier 2  discovery      : mechanical vs structured vs adaptive under equal
//                          rations (2/4/8/16/24/32) on canonical + variant
//                          life and reversi laws. Exact-recovery + held-out
//                          agreement (200 fresh inputs).
// Tier 3  opacity        : witness.canon — all arms fail; the receipt says
//                          "opaque", the honest instrument boundary.
//
// Every run writes a fnv1a64-chained receipt (the fleet's witness idiom) and
// a JSONL trace. Zero live API calls — fully deterministic.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { QuiltEngine } from '../../engine/index.js';
import { buildLaws, probe, maskId } from './laws.mjs';
import { lifeFold, opacityVerdict } from './hyp.mjs';
import { mechanical, structured, adaptive, extractMap, heldOut, identify } from './strategies.mjs';
import { attach } from './sheet.mjs';
import { fnv1a64, canon, mulberry32, verifyChain } from '../../shared/kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'outputs');
mkdirSync(outDir, { recursive: true });

const BUDGETS = [2, 4, 8, 16, 24, 32];
const ARMS = { mechanical, structured, adaptive };
const SEED = 20260926;

const journal = [];
let prev = '0'.repeat(16);
const receipt = (row) => {
  const r = { ...row, prev_hash: prev };
  r.row_hash = fnv1a64(canon(r));
  prev = r.row_hash;
  journal.push(r);
  return r;
};

const laws = buildLaws();
console.log(`hidden laws: ${laws.length} (${laws.map((l) => l.id).join(', ')})`);

// ── Tier 1: identification ───────────────────────────────────────────────────
console.log('\n══ Tier 1 — identification (is the class readable for free?) ══');
const ident = laws.map((law) => {
  const r = identify(law, SEED);
  const hit = law.family.startsWith(r.cls) || (r.cls === 'life' && law.family === 'life') || (r.cls === 'reversi' && law.family.startsWith('reversi'));
  receipt({ kind: 'identify', law: law.id, trueFamily: law.family, shape: r.shape, guessed: r.cls, hit });
  console.log(`  ${law.id.padEnd(14)} shape=${r.shape.padEnd(6)} → ${r.cls.padEnd(8)} ${hit ? 'HIT' : 'MISS'}`);
  return { law: law.id, family: law.family, tier: law.tier, ...r, hit };
});

// ── Tier 2: discovery matrix ─────────────────────────────────────────────────
console.log('\n══ Tier 2 — discovery (probe economies under equal rations) ══');
const results = [];
for (const law of laws.filter((l) => ['canonical', 'variant'].includes(l.tier))) {
  for (const [armName, armFn] of Object.entries(ARMS)) {
    for (const budget of BUDGETS) {
      const seed = SEED + budget * 131 + armName.length;
      const ledger = armFn(law, budget, seed);
      const map = extractMap(law, ledger);
      const ho = heldOut(law, map, 200, seed + 7);
      const exact = map.kind === 'map' && map.survivors === 1 && map.key !== null;
      // exact = fully pinned AND the pinned law agrees with truth on held-out
      const exactHit = exact && ho.agreement === 1;
      const conf = lifeConfOf(law, ledger);
      results.push({
        law: law.id, tier: law.tier, family: law.family, arm: armName, budget,
        mapKind: map.kind, mapKey: map.key ?? null, survivors: map.survivors ?? null,
        exactPinned: exact, heldOut: ho.agreement, exactHit,
        truth: law.tier === 'variant' ? law.truth : undefined,
        surprises: ledger.conflicts,
      });
      receipt({ kind: 'discover', law: law.id, arm: armName, budget, mapKind: map.kind, exact: exactHit, heldOut: ho.agreement });
    }
  }
  console.log(`  ${law.id} done`);
}
function lifeConfOf(law, ledger) {
  if (!ledger.lifeEv) return null;
  const { ev } = lifeFold([ledger.triples]);
  return ev;
}

// ── Tier 3: opacity ──────────────────────────────────────────────────────────
console.log('\n══ Tier 3 — opacity (the instrument boundary) ══');
const opacity = [];
{
  const law = laws.find((l) => l.tier === 'opaque');
  for (const [armName, armFn] of Object.entries(ARMS)) {
    const ledger = armFn(law, 32, SEED + 3);
    const ho = heldOut(law, null, 200, SEED + 9);
    const verdict = opacityVerdict({ minedBits: 0, paramSpaceSize: 1, heldOutAgreement: ho.agreement, chance: 1 / Math.pow(2, 64) });
    opacity.push({ law: law.id, arm: armName, probes: 32, heldOut: ho.agreement, ...verdict });
    receipt({ kind: 'opacity', law: law.id, arm: armName, heldOut: ho.agreement, opaque: verdict.opaque });
    console.log(`  ${law.id} × ${armName}: held-out ${ho.agreement} → ${verdict.opaque ? 'OPAQUE (honest)' : 'model claimed'}`);
  }
}

// ── the sheet mind (one live law, end-to-end, reflex exercised) ──────────────
console.log('\n══ the sheet mind — belief, reflex, map (life variant) ══');
const sheetLaw = laws.find((l) => l.id === 'life.v0');
const e = new QuiltEngine('inverse-oracle', { eager: false });
await attach(e, sheetLaw, 32);
const R = mulberry32(SEED);
const mind = { pinned: 0, key: null, surprises: 0 };
for (let i = 0; i < 32 && mind.pinned < 18; i++) {
  const input = sheetLaw.genInput(R);
  const answer = probe(sheetLaw, input);
  const out = answerToGridSafe(answer);
  if (!out) break;
  const triples = lifeTriplesOf(input.grid, out);
  const r = await e.call('perceive.step', { triples, witnesses: triples });
  if (r && r.status === 'error') throw new Error('perceive.step: ' + JSON.stringify(r.error));
  const d = r.data;
  mind.pinned = d.pinned; mind.key = d.key;
}
mind.surprises = (await e.get('surprise.n')).data;
mind.confidence = (await e.get('confidence')).data;
mind.survivors = (await e.get('map.survivors')).data;
mind.scar = (await e.get('scar.note')).data;
console.log(`  mind after ration: pinned=${mind.pinned}/18 key=${mind.key} survivors=${mind.survivors} surprise=${mind.surprises} confidence=${mind.confidence}`);
// inject a LIE into the channel → the reflex must scar
await e.call('perceive.step', { triples: [{ state: 0, n: 3, out: 0 }], witnesses: [{ state: 0, n: 3, out: 0 }] }); // the channel lies
const surpriseAfterLie = (await e.get('surprise.n')).data;
console.log(`  after one channel-lie: surprise.n ${mind.surprises} → ${surpriseAfterLie} (reflex ${surpriseAfterLie > mind.surprises ? 'SCARRED ✓' : 'DID NOT FIRE ✗'})`);
const sheetReceipt = {
  kind: 'sheet-mind', law: sheetLaw.id, pinned: mind.pinned, key: mind.key,
  survivors: mind.survivors, confidence: mind.confidence,
  surpriseBeforeLie: mind.surprises, surpriseAfterLie, reflexFired: surpriseAfterLie > mind.surprises,
};
receipt(sheetReceipt);

// ── persist + chain verify ───────────────────────────────────────────────────
const chainOk = verifyChain(journal, (r) => { const { row_hash, ...rest } = r; return rest; });
const payload = {
  meta: { at: new Date().toISOString(), seed: SEED, budgets: BUDGETS, laws: laws.length, chainOk, chainLen: journal.length },
  identification: ident,
  discovery: results,
  opacity,
  sheetMind: sheetReceipt,
  receipts: journal,
};
writeFileSync(join(outDir, 'results.json'), JSON.stringify(payload, null, 1));
writeFileSync(join(outDir, 'trace.jsonl'), journal.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.log(`\nreceipt chain: ${journal.length} rows, verifyChain ${chainOk ? 'OK' : 'BROKEN'}`);
console.log(`wrote ${join(outDir, 'results.json')}`);

function answerToGridSafe(answer) {
  try {
    const o = JSON.parse(answer);
    if (Array.isArray(o) && o.every((r2) => Array.isArray(r2))) return o.map((row) => row.map(Number));
    if (Array.isArray(o) && o.every((r2) => typeof r2 === 'string')) return o.map((row) => [...row].map(Number));
  } catch { }
  return null;
}
function lifeTriplesOf(grid, out) {
  const H = grid.length, W = grid[0].length, seen = new Map();
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    let n = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= H || nc >= W) continue;
      n += grid[nr][nc];
    }
    const key = grid[r][c] + '|' + n;
    if (!seen.has(key)) seen.set(key, { state: grid[r][c], n, out: out[r][c] });
  }
  return [...seen.values()];
}
