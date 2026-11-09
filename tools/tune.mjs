#!/usr/bin/env node
// tools/tune.mjs — from the MNIST training file only: grow the cell (Rung 1's kernel and settings), choose τ by the sealed
// rule with amendment 1's fallback, and choose the exploratory margin gate's τ the same way (not a claim). Writes
// data/cell.txt and data/tune.json. `--check` re-derives both byte for byte (CI).
import { readFileSync, writeFileSync } from 'node:fs';
import { train } from './data.mjs';
import R from '../src/run.mjs';

const ROOT = new URL('../', import.meta.url);
const t0 = Date.now(), r = R.tune(train());
const out = JSON.stringify({ tau: r.tau, met: r.met, tuneNumbers: r.tuneNumbers, settings: R.SETTINGS,
  rule: 'the smallest τ in 50..100 step 5 whose accepted tune numbers are at least 99.5% exactly right; if none (amendment 1), the highest tune precision, the smaller on a tie',
  table: r.table, explore: { tau: r.explore.tau, met: r.explore.met, table: r.explore.table, note: 'not a sealed claim (AMENDMENT.md)' } }, null, 1) + '\n';
if (process.argv.includes('--check')) {
  const same = readFileSync(new URL('data/cell.txt', ROOT), 'utf8') === r.cellText && readFileSync(new URL('data/tune.json', ROOT), 'utf8') === out;
  console.log(same ? 'TUNE REPRODUCED · τ ' + r.tau : 'TUNE DIFFERS');
  process.exit(same ? 0 : 1);
}
writeFileSync(new URL('data/cell.txt', ROOT), r.cellText);
writeFileSync(new URL('data/tune.json', ROOT), out);
console.log('tune: τ = ' + r.tau + (r.met ? ' (meets 99.5%)' : ' (no τ meets 99.5%: amendment 1 fallback)') + ' on ' + r.tuneNumbers + ' tune numbers; exploratory margin gate τ = ' + r.explore.tau + ', ' + Math.round((Date.now() - t0) / 1000) + ' s');
