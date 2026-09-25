// jeve/mind.mjs — the FIFTH rival mind: JEVE.
//
// Controlled-comparison design: JEVE's sheet is the LIN-family contract
// (same styles, same 14 derived weights, same inf.predict/inf.update
// opponent models, same learn.revise script-writer) — so recovery accuracy
// measures the DECISION SURFACE, not different plumbing. What changes:
//
//   1. act.choose never spends on its own; it publishes its candidate
//      scores + margin (the sheet's own "opinion distribution").
//   2. The driver consults the TypeSafe System One ONE-PASS only when the
//      sheet is DOUBT-THIN (margin below threshold) — attention by
//      uncertainty. One batch = move choice + pressure score + worth noul
//      (the MOTH purchase gate, replacing the fixed budget reflex).
//   3. The final pick blends the sheet softmax with jev's calibrated
//      distribution (soft posterior, never a hard argmax override).
//   4. The calibration delta nudges style cells (rate-limited, receipted)
//      — the mind literally learns toward calibrated judgment.
//   5. The per-SET revision is ONE jev batch (family/drift/explore) mapped
//      onto the arena's A–E letter doctrine — the analyst, one-passed.

import { buildAgentCells, FAMILIES, STYLE_KEYS, MW_FEATS, HW_FEATS } from '../arena/minds.mjs';

export const JEVE_ID = 'p4';

// ── JEVE act.choose: score + publish, never self-spend ───────────────────────
const JEV_CHOOSE = `
  const gv = async (id) => (await runtime.get(id)).data;
  const featScore = (f, w) => { let s = 0; for (const k in f) s += (w[k] ?? 0) * f[k]; return s; };
  const softmax = (xs, t) => { t = t || 1; const m = Math.max(...xs);
    const ex = xs.map((x) => Math.exp((x - m) / Math.max(1e-6, t)));
    const z = ex.reduce((a, b) => a + b, 0); return ex.map((e) => e / z); };
  const wmap = { mines: { adj: 'mw.adj', adjSum: 'mw.adjSum', front: 'mw.front', info: 'mw.info', dens: 'mw.dens', center: 'mw.center', avoid: 'mw.avoid' },
                 hearts: { winp: 'hw.winp', pts: 'hw.pts', high: 'hw.high', trickPts: 'hw.trickPts', lead: 'hw.lead', voidp: 'hw.voidp', aggr: 'hw.aggr' } };
  const readW = async (game) => { const w = {}; for (const f in wmap[game]) { const c = await gv(wmap[game][f]); w[f] = c ?? 0; } return w; };
  const game = input.game;
  const feats = input.feats, ids = Object.keys(feats);
  const w = await readW(game);
  const entries = ids.map((id) => ({ id, s: featScore(feats[id], w) })).sort((a, b) => b.s - a.s);
  const margin = entries[0].s - (entries[1] ? entries[1].s : 0);
  const cur = (await gv('st.curiosity')) ?? 0;
  const temp = 0.35 + Math.max(0, Math.min(1, (cur + 1) / 2)) * 0.5;
  const top = entries.slice(0, Math.min(6, entries.length));
  const probs = softmax(top.map((e) => e.s), temp);
  // JEVE never spends by itself — the driver owns the doubt economy.
  // Publish the opinion distribution so the driver can blend with System One.
  return {
    pick: entries[0].id, spend: 0,
    think: 'jeve argmax m=' + margin.toFixed(3) + ' T=' + temp.toFixed(2) + ' (awaiting doubt consult)',
    entries: top.map((e, i) => ({ id: String(e.id), s: +e.s.toFixed(4), p: +probs[i].toFixed(4) })),
    margin: +margin.toFixed(4), temp,
  };
`;

// ── THE SEAM (RECONSTRUCTED 2026-09-26) ──────────────────────────────────────
// The original uncommitted seam implementation was lost in the sanitized
// GitHub drop (only its import contract survived in arena5.mjs/smoke.mjs).
// This reconstruction honors the same contract: buildSeamState (deterministic
// state string), buildSeamQuestions (one batched System One pass: family
// choice + fit_H2 score + drift/explore noul), seamAnswerToTeachInput, and a
// jev.teach program cell that blends the sheet's family posterior toward the
// System One judgment and appends a hash-chained receipt. Semantics are
// documented inline; recorded FINDINGS numbers (recovery acc etc.) refer to
// the lost build — treat post-seam runs as a re-baseline.

export const HYPS = ['LIN', 'WAVE', 'BAYES', 'MASK', 'JEVE'];
export const buildJeveSheet = buildJevSheet; // historical alias
export const JEVE = JEVE_ID;                 // historical alias (seat id)
export const HKEYS = HW_FEATS;               // historical alias (hearts feature keys)

const r4 = (x) => +(Number(x) || 0).toFixed(4);

export function buildSeamState({ aid, scriptV, setNo, budgetN, letter, focal, model, styles, spendRatio, mothLeft }) {
  const post = model?.post ? Object.entries(model.post).sort((a, b) => b[1] - a[1]).map(([k, p]) => `${k}:${r4(p)}`).join(',') : 'none';
  const wTop = model?.w ? Object.entries(model.w).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5).map(([k, p]) => `${k}:${r4(p)}`).join(',') : 'none';
  const st = styles ? Object.entries(styles).map(([k, p]) => `${k}:${r4(p)}`).join(',') : 'none';
  return [
    'jev-seam v1', `seat=${aid}`, `v=${scriptV}`, `set=${setNo}`, `n=${budgetN}`, `letter=${letter ?? 'P'}`,
    `focal=${focal}`, `obs=${model?.n ?? 0}`, `H=${model?.H ?? 0}`, `acc=${model?.acc ?? 'na'}`,
    `post=${post}`, `w=${wTop}`, `styles=${st}`, `spend=${r4(spendRatio)}`, `moth=${mothLeft}`,
  ].join('|');
}

export function buildSeamQuestions({ focal, model, mothLeft }) {
  const acc = typeof model?.acc === 'number' ? model.acc : 0.5;
  return {
    family: {
      type: 'choice',
      instructions: `Seat ${focal} played ${model?.n ?? 0} observed moves (prediction acc ${r4(acc)}). Which decision-family is it most plausible?`,
      criteria: {
        LIN: 'predictable linear scorer — steady feature-weighted picks',
        WAVE: 'spectral analyst — reads streams as waveforms, confirms shifts',
        BAYES: 'particle posterior — many hypotheses, resamples under collapse',
        MASK: 'adversarial mixer — models what YOU believe, buys unpredictability',
        JEVE: 'System One surface — score+publish, doubt-gated consults',
      },
    },
    fit_H2: {
      type: 'score',
      instructions: `How well does a 2-parameter harmonic fit explain seat ${focal}'s move-margin stream?`,
      criteria: ['locked', 'steady', 'drifting', 'chaotic'],
    },
    drift: { type: 'noul', instructions: `Has seat ${focal} changed strategy recently (drift detected)?` },
    explore: { type: 'noul', instructions: `Given ${mothLeft} perception budget left, is exploration worth purchasing this set?` },
  };
}

export function seamAnswerToTeachInput(answers) {
  return {
    dist: answers?.family?.probabilities ?? null,
    h2: answers?.fit_H2?.score ?? null,
    drift: answers?.drift?.noul ?? null,
    explore: answers?.explore?.noul ?? null,
  };
}

// the teach cell: blend belief toward System One, receipt the delta
const JEV_TEACH = `
  const gv = async (id) => (await runtime.get(id)).data;
  const HYPS = ${JSON.stringify(HYPS)};
  const norm = (d) => { const z = Object.values(d).reduce((a, b) => a + b, 0) || 1;
    const o = {}; for (const k of Object.keys(d)) o[k] = d[k] / z; return o; };
  const mover = input.mover;
  const model = (await gv('inf.' + mover)) || {};
  const prior = norm(model.post && Object.keys(model.post).length ? model.post : Object.fromEntries(HYPS.map((h) => [h, 1 / HYPS.length])));
  const dist = norm(input.dist && Object.keys(input.dist).length ? input.dist : Object.fromEntries(HYPS.map((h) => [h, 1 / HYPS.length])));
  const mae = HYPS.reduce((a, h) => a + Math.abs((prior[h] ?? 0) - (dist[h] ?? 0)), 0) / HYPS.length;
  const lam = 0.02 + 0.06 * (input.drift ?? 0.5);            // drift noul buys plasticity
  const post = {}; let tv = 0;
  for (const h of HYPS) { post[h] = (1 - lam) * (prior[h] ?? 0) + lam * (dist[h] ?? 0); tv += Math.abs(post[h] - (prior[h] ?? 0)); }
  const z = Object.values(post).reduce((a, b) => a + b, 0) || 1;
  for (const h of HYPS) post[h] = +(post[h] / z).toFixed(4);
  const top = (d) => Object.entries(d).sort((a, b) => b[1] - a[1])[0][0];
  const beforeTop = top(prior), afterTop = top(post);
  model.post = post;
  await runtime.set('inf.' + mover, model);
  // style nudge: explore noul steers curiosity (the doubt economy dial)
  const cur = ((await gv('st.curiosity')) ?? 0) + ((input.explore ?? 0.5) - 0.5) * lam;
  await runtime.set('st.curiosity', +cur.toFixed(4));
  await runtime.set('jev.explore', input.explore ?? null);
  await runtime.set('jev.mae', +mae.toFixed(4));
  await runtime.set('jev.calls', ((await gv('jev.calls')) | 0) + 1);
  if (input.source === 'live') await runtime.set('jev.live', ((await gv('jev.live')) | 0) + 1);
  const jr = (await gv('jev.journal')) || [];
  jr.push({ tag: input.tag ?? null, mover, mae: +mae.toFixed(4), lam: +lam.toFixed(4), mock: !!input.mock, source: input.source ?? 'mock' });
  await runtime.set('jev.journal', jr.slice(-40));
  const chain = (await gv('jev.chain')) || [];
  const prev = chain.length ? chain[chain.length - 1].row_hash : '0'.repeat(16);
  const v = (await gv('script.v')) | 0;
  const row = { seq: chain.length + 1, mover, v, dist: post, mae: +mae.toFixed(4), lam: +lam.toFixed(4),
    drift: input.drift ?? null, explore: input.explore ?? null, source: input.source ?? 'mock', mock: !!input.mock, prev_hash: prev };
  const fnv1a64 = (s) => { let h = 0xcbf29ce484222325n; const p = 0x100000001b3n, m = 0xffffffffffffffffn;
    for (let i = 0; i < s.length; i++) { h ^= BigInt(s.charCodeAt(i)); h = (h * p) & m; } return h.toString(16).padStart(16, '0'); };
  const canonRow = (r) => { const s = {}; for (const k of Object.keys(r).sort()) s[k] = r[k]; return JSON.stringify(s); };
  row.row_hash = fnv1a64(canonRow(row));
  chain.push(row);
  await runtime.set('jev.chain', chain.slice(-200));
  return { mae: +mae.toFixed(4), lam: +lam.toFixed(4), tv: +(tv / 2).toFixed(4), flipped: beforeTop !== afterTop,
    beta: +lam.toFixed(4), post, beforeTop, afterTop };
`;

export function buildJevCells(aid = JEVE_ID) {
  // LIN contract as the base (identical inf.* machinery for fair comparison)
  const cells = buildAgentCells(aid, 'LIN');
  // swap the decision surface
  const i = cells.findIndex((c) => c.id === 'act.choose');
  cells[i] = { id: 'act.choose', kind: 'program', code: JEV_CHOOSE, description: 'JEVE: score + publish opinion distribution (driver owns the doubt economy)' };
  // every modeled opponent carries a family posterior (taught at the seam)
  for (const c of cells) {
    if (c.id.startsWith('inf.') && c.id !== 'inf.self' && c.kind === 'value' && c.value && typeof c.value === 'object') {
      c.value.post = Object.fromEntries(HYPS.map((h) => [h, +(1 / HYPS.length).toFixed(4)]));
    }
  }
  // System One bookkeeping cells (visible, receipted)
  cells.push({ id: 'jev.calls', kind: 'value', value: 0, description: 'System One one-pass calls consumed (live+mock)' });
  cells.push({ id: 'jev.live', kind: 'value', value: 0, description: 'live System One calls consumed' });
  cells.push({ id: 'jev.mae', kind: 'value', value: null, description: 'last calibration MAE (sheet opinion vs jev distribution)' });
  cells.push({ id: 'jev.journal', kind: 'value', value: [], description: 'System One receipts: {tag, gate, blend, mae, mock}' });
  cells.push({ id: 'jev.explore', kind: 'value', value: null, description: 'per-set explore noul (gates MOTH purchases)' });
  cells.push({ id: 'jev.chain', kind: 'value', value: [], description: 'seam receipts, hash-chained (seq,mover,v,dist,mae,lam,drift,explore,source,mock)' });
  cells.push({ id: 'jev.teach', kind: 'program', code: JEV_TEACH, description: 'seam teach: blend family posterior toward System One, receipt the delta', deps: [] });
  return cells;
}

export function buildJevSheet(aid = JEVE_ID) {
  return { id: aid, title: `JEVE mind (${aid}) — System One decision surface`, cells: buildJevCells(aid) };
}

// ── driver-side blending helpers (pure, testable) ────────────────────────────
export function blendDistributions(sheetEntries, jevDist, alpha = 0.5) {
  const out = {};
  const ids = new Set([...sheetEntries.map(e => e.id), ...Object.keys(jevDist || {})]);
  for (const id of ids) {
    const sp = sheetEntries.find(e => e.id === id)?.p ?? 0;
    const jp = jevDist[id] ?? 0;
    out[id] = alpha * jp + (1 - alpha) * sp;
  }
  const z = Object.values(out).reduce((a, b) => a + b, 0) || 1;
  for (const k of Object.keys(out)) out[k] = +(out[k] / z).toFixed(4);
  return out;
}

export function argmaxDist(dist) {
  return Object.entries(dist).sort((a, b) => b[1] - a[1])[0][0];
}

// calibration delta between sheet opinion and jev distribution → style nudges.
// jev wanting MORE variance across options = curiosity; jev favoring "avoid"
// features = fear; jev top pick matching social-weighted score = social.
export function styleNudgeFromDelta(sheetDist, jevDist, lr = 0.04) {
  const keys = new Set([...Object.keys(sheetDist), ...Object.keys(jevDist)]);
  let dAbs = 0, sheetSpread = 0, jevSpread = 0;
  const sv = Object.values(sheetDist), jv = Object.values(jevDist);
  const spread = (v) => Math.max(...v) - Math.min(...v) / Math.max(1e-9, v.length);
  sheetSpread = Math.max(...sv) - Math.min(...sv);
  jevSpread = Math.max(...jv) - Math.min(...jv);
  for (const k of keys) dAbs += Math.abs((jevDist[k] || 0) - (sheetDist[k] || 0));
  const mae = dAbs / Math.max(1, keys.size);
  return {
    mae: +mae.toFixed(4),
    nudges: {
      curiosity: +lr * (jevSpread - sheetSpread) * 4,   // jev sharper → curious less, jev flatter → explore more
      fear: +lr * mae * 2,                              // disagreement is information → respect danger a bit more
      social: +lr * ((jevDist['avoid'] ?? 0) - (sheetDist['avoid'] ?? 0)) * 6,
    },
  };
}
