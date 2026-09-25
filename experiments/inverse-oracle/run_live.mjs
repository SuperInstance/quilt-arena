// inverse-oracle/run_live.mjs — THE SYSTEM ONE LEG.
//
// Question: when the candidate list is the adaptive machinery's, does System
// One judgment (1 batched typesafe call per round: which probe to buy + is it
// worth it) match or beat the information-theoretic order? We run the
// directed prober on ONE life variant + ONE reversi variant under a HARD cap
// of 6 real calls, receipted and cached; the replay pass then re-runs from
// cache with cap 0 and must produce identical ledgers with zero new calls.
//
//   export TYPESAFE_API_KEY=... && node run_live.mjs        (live, capped)
//   node run_live.mjs                                       (replay, free)
//
// The key is read from env ONLY. Never hardcoded, never logged.

import { writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JevVault } from '../../../quilt-cortex/cortex/typesafe.mjs';
import { buildLaws } from './laws.mjs';
import { systone, extractMap, heldOut } from './strategies.mjs';
import { attach } from './sheet.mjs';
import { QuiltEngine } from '../../engine/index.js';
import { fnv1a64, canon } from '../../shared/kit.mjs';

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(here, 'outputs'), { recursive: true });
mkdirSync(join(here, '.cache'), { recursive: true });

const KEY = process.env.TYPESAFE_API_KEY || '';
const LIVE = Boolean(KEY);
const CAP = 6;
const journal = [];
const cachePath = join(here, '.cache', 'typesafe-inverse-oracle.json');

const vault = new JevVault({
  key: LIVE ? KEY : null,
  ns: LIVE ? 'LIVE' : 'OFF',
  cap: LIVE ? CAP : 0,
  journal,
  cachePath,
});

console.log(`mode: ${LIVE ? `LIVE (cap ${CAP} real calls, key from env)` : 'REPLAY (cache only, zero new calls)'}`);

const laws = buildLaws();
const targets = ['life.v0', 'reversi.v0'];
const runs = {};
let prev = '0'.repeat(16);
const receipt = (row) => {
  const r = { ...row, prev_hash: prev };
  r.row_hash = fnv1a64(canon(r));
  prev = r.row_hash;
  journal.push(r);
};

for (const id of targets) {
  const law = laws.find((l) => l.id === id);
  const ledger = await systone(law, 16, 20260926, vault, `inverse-oracle:${id}`);
  const map = extractMap(law, ledger);
  const ho = heldOut(law, map, 200, 20260926 + 7);
  const sysoneRounds = ledger.probes.filter((p) => p.sysone).length;
  const liveRounds = ledger.probes.filter((p) => p.sysone?.source === 'live').length;
  receipt({ kind: 'live-run', law: id, mapKind: map.kind, mapKey: map.key ?? null, survivors: map.survivors ?? null, heldOut: ho.agreement, sysoneRounds, liveRounds });
  runs[id] = {
    probes: ledger.probes.length,
    sysoneRounds,
    liveRounds,
    mapKind: map.kind,
    mapKey: map.key ?? null,
    survivors: map.survivors ?? null,
    heldOut: ho.agreement,
    truth: law.truth,
    picks: ledger.probes.filter((p) => p.crafted !== null && p.crafted !== undefined).map((p) => p.crafted),
    sysoneMeta: ledger.probes.filter((p) => p.sysone).map((p) => p.sysone),
  };
  console.log(`  ${id}: map=${map.kind} key=${map.key ?? '-'} survivors=${map.survivors} heldOut=${ho.agreement} (system-one rounds: ${sysoneRounds}, live: ${liveRounds})`);
}

// the reflex check on the live mind (same sheet contract as offline)
const sheetLaw = laws.find((l) => l.id === 'life.v0');
const e = new QuiltEngine('inverse-oracle-live', { eager: false });
await attach(e, sheetLaw, 16);
const rLie = await e.call('perceive.step', { triples: [], witnesses: [{ state: 0, n: 3, out: 0 }] });
receipt({ kind: 'live-reflex', law: sheetLaw.id, surprise: (await e.get('surprise.n')).data });

const summary = {
  meta: { at: new Date().toISOString(), live: LIVE, cap: CAP, liveUsed: vault.liveUsed, tokens: vault.tokens, lawCount: laws.length },
  runs,
  receipts: journal,
};
writeFileSync(join(here, 'outputs', 'live_results.json'), JSON.stringify(summary, null, 1));
// HYGIENE: if a LIVE pass spent zero real calls (bad/rotated key → mock
// fallback), purge the cache so mock answers never shadow future real ones.
if (LIVE && vault.liveUsed === 0) {
  try { unlinkSync(cachePath); console.log('hygiene: zero live calls succeeded — purged cache (mock answers must not shadow LIVE ns)'); }
  catch { /* nothing to purge */ }
}
console.log(`\njev: ${vault.liveUsed} live calls this pass (cap ${CAP}), tokens in=${vault.tokens.input} out=${vault.tokens.output}`);
console.log(`receipts: ${journal.length}, chain tip ${prev.slice(0, 8)}…`);
console.log(`wrote ${join(here, 'outputs', 'live_results.json')}`);
