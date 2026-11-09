#!/usr/bin/env node
// tools/run.mjs — the held-out numbers, read once. It refuses to run unless SEAL2.md names the cell by its SHA-256 and
// states both τ values, and unless the four MNIST files are the ones seal 1 pinned. Writes data/record.json.
// `--check` re-runs and fails unless the record reproduces exactly: CI runs that on every push.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test } from './data.mjs';
import R from '../src/run.mjs';

export const PINS = { 'train-images-idx3-ubyte.gz': '440fcabf73cc546fa21475e81ea370265605f56be210a4024d2ca8f203523609', 'train-labels-idx1-ubyte.gz': '3552534a0a558bbed6aed32b30c495cca23d567ec52cac8be1a0730e8010255c',
  't10k-images-idx3-ubyte.gz': '8d422c7b0a1c1c79245a5bcf07fe86e33eeafee792b84584aec276f5a2dbc4e6', 't10k-labels-idx1-ubyte.gz': 'f7ae60f92e00ec6debd23a6088c31dbd2371eca3ffa0defaefb259924204aec6' };
const ROOT = new URL('../', import.meta.url);
const raw = (p) => readFileSync(new URL(p, ROOT));
const read = (p) => raw(p).toString('utf8');
const sha = (p) => createHash('sha256').update(raw(p)).digest('hex');
const stop = (why) => { console.error('run: ' + why); process.exit(1); };

if (!existsSync(new URL('SEAL2.md', ROOT))) stop('no SEAL2.md: the cell and τ are not frozen, so the test digits may not be read');
const seal = read('SEAL2.md'), tune = JSON.parse(read('data/tune.json'));
if (!seal.includes(sha('data/cell.txt'))) stop('data/cell.txt is not the cell seal 2 names');
if (!seal.includes('τ = ' + tune.tau + ' ') || !seal.includes('exploratory τ = ' + tune.explore.tau + ' ')) stop('seal 2 does not state the τ values in data/tune.json');
for (const [f, h] of Object.entries(PINS)) if (sha('data/mnist/' + f) !== h) stop(f + ' is not the file seal 1 pinned');

const t0 = Date.now();
const record = R.evaluate({ test: test(), cellText: read('data/cell.txt'), tau: tune.tau, exploreTau: tune.explore.tau });
if (!record) stop('the record did not compute');
const out = JSON.stringify({ record, verdicts: R.verdicts(record) }, null, 1) + '\n';
if (process.argv.includes('--check')) {
  const same = read('data/record.json') === out;
  console.log(same ? 'RECORD REPRODUCED · ' + record.hash.slice(0, 16) : 'RECORD DIFFERS');
  process.exit(same ? 0 : 1);
}
writeFileSync(new URL('data/record.json', ROOT), out);
console.log('held-out: ' + record.numbers + ' numbers from ' + record.digits + ' test digits, ' + Math.round((Date.now() - t0) / 1000) + ' s · record ' + record.hash);
for (const v of R.verdicts(record)) console.log((v.pass ? '  held   ' : '  FAILED ') + v.id + ' · ' + v.what + ' · ' + JSON.stringify(v.measured) + ' (bar ' + v.bar + ')');
