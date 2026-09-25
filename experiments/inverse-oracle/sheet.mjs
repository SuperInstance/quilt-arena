// inverse-oracle/sheet.mjs — THE INFERENCE MIND IS A SHEET.
//
// Perception machinery (input generation, answer mining) lives in the
// harness; BELIEF lives here. The sheet holds:
//   evidence     — the pinned parameters (life B/S bits, reversi ray votes)
//   probe.witnesses — the frozen (state,n,out) / (dir,flipped) facts it has
//                     PAID for; the reflex re-explains these on every write
//   surprise.n   — how many times the evidence stopped explaining witnesses
//                  (the scar counter; impossible for a true law, the
//                  tripwire for a corrupt channel)
//   map.*        — the current best law (assembled key + survivor count)
//   confidence   — pinned/total (formula cell)
//   budget.left  — the ration
//
// The listener is the REFLEX (watch evidence → re-explain witnesses → scar
// on contradiction). Gate inside the action program: listener conditions see
// only caller.metadata.{current,prev} — the E9 fence, learned the hard way.

import { v, prog, formula, listenerCell } from '../../shared/kit.mjs';

const REFLEX = `
  const gv = async (id) => (await runtime.get(id)).data;
  // listener actions receive input = {changed, value}; the new watched value
  // is input.value (caller.metadata.current is the same, read via caller)
  const ev = input.value || (caller && caller.metadata && caller.metadata.current) || {};
  const wit = (await gv('probe.witnesses')) || [];
  let bad = 0;
  if ((await gv('law.family')).startsWith('life')) {
    for (const w of wit) {
      const slot = w.state === 1 ? ev.s : ev.b;
      if (slot && slot[w.n] !== null && slot[w.n] !== undefined && slot[w.n] !== w.out) bad++;
    }
  } else {
    for (const w of wit) {
      if (ev.active && ev.active[w.d] !== null && ev.active[w.d] !== undefined && ev.active[w.d] !== (w.flipped ? 1 : 0)) bad++;
    }
  }
  const prevBad = (await gv('reflex.bad')) || 0;
  await runtime.set('reflex.bad', bad);
  if (bad > prevBad) {
    const n = ((await gv('surprise.n')) | 0) + 1;
    await runtime.set('surprise.n', n);
    await runtime.set('scar.note', 'evidence stopped explaining ' + bad + ' witness(es) @ ' + new Date().toISOString());
  }
  return { bad, surprise: (await gv('surprise.n')) | 0 };
`;

const PERCEIVE = `
  const gv = async (id) => (await runtime.get(id)).data;
  const fam = await gv('law.family');
  const ev = (await gv('evidence')) || (fam.startsWith('life') ? { b: Array(9).fill(null), s: Array(9).fill(null) } : { active: Array(8).fill(null) });
  const wit = (await gv('probe.witnesses')) || [];
  const step = input || {};
  if (fam.startsWith('life')) {
    for (const t of (step.triples || [])) {
      const slot = t.state === 1 ? ev.s : ev.b;
      if (slot[t.n] === null || slot[t.n] === undefined) slot[t.n] = t.out;
      else if (slot[t.n] !== t.out) { /* channel lie; the reflex will scar */ }
    }
    for (const w of (step.witnesses || [])) wit.push(w);
  } else {
    for (const vt of (step.votes || [])) {
      if (ev.active[vt.d] === null || ev.active[vt.d] === undefined) ev.active[vt.d] = vt.flipped ? 1 : 0;
      else if (ev.active[vt.d] !== (vt.flipped ? 1 : 0)) { /* reflex scars */ }
    }
    for (const w of (step.witnesses || [])) wit.push(w);
  }
  await runtime.set('probe.witnesses', wit.slice(-200)); // witnesses BEFORE evidence: the reflex must see the new facts
  await runtime.set('evidence', ev);
  const left = ((await gv('budget.left')) | 0) - 1;
  await runtime.set('budget.left', left);
  // map assembly
  let pinned = 0, total = 0, key = '', survivors = 1;
  if (fam.startsWith('life')) {
    total = 18;
    const kb = [], ks = [];
    for (let k = 0; k < 9; k++) {
      if (ev.b[k] !== null && ev.b[k] !== undefined) pinned++;
      if (ev.s[k] !== null && ev.s[k] !== undefined) pinned++;
      kb.push(ev.b[k] === null || ev.b[k] === undefined ? '?' : (ev.b[k] ? String(k) : ''));
      ks.push(ev.s[k] === null || ev.s[k] === undefined ? '?' : (ev.s[k] ? String(k) : ''));
    }
    key = 'B' + kb.join('') + '/S' + ks.join('');
    survivors = Math.pow(2, total - pinned);
  } else {
    total = 8;
    const ka = [];
    for (let d = 0; d < 8; d++) {
      if (ev.active[d] !== null && ev.active[d] !== undefined) pinned++;
      ka.push(ev.active[d] === null || ev.active[d] === undefined ? '?' : String(ev.active[d]));
    }
    key = 'rays:' + ka.join('');
    survivors = Math.pow(2, total - pinned);
  }
  const out = { pinned, total, key, survivors, kind: pinned === total ? 'map' : 'underdetermined', budgetLeft: left };
  await runtime.set('map.pinned', pinned);
  await runtime.set('map.total', total);
  await runtime.set('map.key', key);
  await runtime.set('map.survivors', survivors);
  return out;
`;

export function buildInferenceSheet(law, budget) {
  const cells = [];
  cells.push(v('law.id', law.id, 'the hidden law under investigation (id only — never its truth)'));
  cells.push(v('law.family', law.family, 'the family alphabet this mind may assume'));
  cells.push(v('law.tier', law.tier, 'canonical | variant | known | opaque'));
  cells.push(v('budget.left', budget, 'the probe ration (perception is not free)'));
  cells.push(v('doctrine.1', 'isolate, perturb, measure — a crafted probe beats a lucky board', 'method doctrine'));
  cells.push(v('doctrine.2', 'every answer is mined for ALL the evidence it carries', 'economy doctrine'));
  cells.push(v('doctrine.3', 'belief must keep explaining its witnesses; else scar', 'reflex doctrine'));
  cells.push(v('evidence', law.family.startsWith('life') ? { b: Array(9).fill(null), s: Array(9).fill(null) } : { active: Array(8).fill(null) }, 'pinned parameters'));
  cells.push(v('probe.witnesses', [], 'the facts bought with the ration'));
  cells.push(v('surprise.n', 0, 'contradiction counter (the scar)'));
  cells.push(v('scar.note', '', 'latest scar receipt'));
  cells.push(v('reflex.bad', 0, 'witness mismatches at last reflex'));
  cells.push(v('map.pinned', 0, 'pinned parameters'));
  cells.push(v('map.total', law.family.startsWith('life') ? 18 : 8, 'parameter space size'));
  cells.push(v('map.key', '?', 'current best law key'));
  cells.push(v('map.survivors', null, 'hypotheses consistent with evidence (2^unpinned)'));
  cells.push(formula('confidence', 'map.pinned / map.total', 'fraction of the law pinned'));
  cells.push(prog('perceive.step', PERCEIVE, 'fold probe witnesses into belief; assemble the map; spend one ration unit', []));
  cells.push(prog('reflex.contradict', REFLEX, 'listener action: re-explain witnesses under current evidence; scar on contradiction', []));
  cells.push(listenerCell('watch.evidence', ['evidence'], 'reflex.contradict', null, 'belief changed → re-explain the witnesses'));
  return {
    id: `infer.${law.id}`,
    title: `inverse-oracle mind on ${law.id}`,
    cells: cells.filter(Boolean),
  };
}

export async function attach(engine, law, budget) {
  const sheet = buildInferenceSheet(law, budget);
  await engine.loadSheet(sheet);
  return sheet;
}
