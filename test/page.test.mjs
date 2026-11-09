// The page and the files, held to their sealed claims: H8 (no measured number typed into the page), H9 (the data and the
// vendored kernel are the pinned bytes), seal 2 naming the cell and τ, the credits, and the failures told.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const sha = (p) => createHash('sha256').update(readFileSync(new URL(p, ROOT))).digest('hex');
const html = read('index.html'), app = read('app.mjs'), claims = read('CLAIMS.md');

test('H9: the MNIST files and every vendored file are the pinned bytes', () => {
  for (const f of ['train-images-idx3-ubyte.gz', 'train-labels-idx1-ubyte.gz', 't10k-images-idx3-ubyte.gz', 't10k-labels-idx1-ubyte.gz']) assert.ok(claims.includes(sha('data/mnist/' + f)), f);
  assert.ok(claims.includes(sha('vendor/settling-cell/src/cell.mjs')));
  const pinned = new Map();
  for (const s of JSON.parse(read('vendor/SOURCES.json')).sources) for (const f of s.files) pinned.set(f.path, f.sha256);
  const files = [];
  (function walk(d) { for (const n of readdirSync(new URL(d, ROOT))) { const p = d + '/' + n; if (statSync(new URL(p, ROOT)).isDirectory()) walk(p); else files.push(p); } })('vendor');
  for (const f of files.filter((x) => x !== 'vendor/SOURCES.json')) { assert.ok(pinned.has(f), f + ' is not pinned'); assert.equal(sha(f), pinned.get(f), f + ' changed'); }
});

test('seal 2 names the cell and both τ values, and the record uses them', () => {
  const seal = read('SEAL2.md'), t = JSON.parse(read('data/tune.json')), r = JSON.parse(read('data/record.json')).record;
  assert.ok(seal.includes(sha('data/cell.txt')));
  assert.ok(seal.includes('τ = ' + t.tau + ' ') && seal.includes('exploratory τ = ' + t.explore.tau + ' '));
  assert.equal(r.cellHash, sha('data/cell.txt'));
  assert.deepEqual([r.tau, r.explore.tau], [t.tau, t.explore.tau]);
});

test('H8: no measured number is typed into the page', () => {
  const r = JSON.parse(read('data/record.json')).record, forms = new Set();
  const frac = (v) => { if (v > 0 && v < 1) { forms.add(String(v)); forms.add((v * 100).toFixed(1) + '%'); } };
  for (const [a, b] of [[r.accepted, r.numbers], [r.right, r.accepted], [r.settleOnlyRight, r.numbers], [r.repairedRight, r.repaired], [r.explore.right, r.explore.accepted], [r.explore.accepted, r.numbers]]) if (b) frac(a / b);
  for (const n of [r.numbers, r.accepted, r.right, r.repaired, r.repairedRight, r.acceptedNoRepair, r.settleOnlyRight, ...Object.values(r.reasons)]) if (n > 9) { forms.add(n.toLocaleString('en-GB') + ' '); forms.add(' ' + n + ' '); }
  for (const v of Object.values(r.lows)) forms.add(Math.abs(v * 100).toFixed(2) + ' points');
  forms.add(r.hash.slice(0, 12));
  const visible = html.replace(/<style>[\s\S]*?<\/style>/, '');
  for (const s of forms) assert.equal(visible.includes(s), false, 'the page has "' + s + '" typed in; it must come from the record');
  assert.match(app, /pct\(r\.accepted \/ r\.numbers\)/);
});

test('the failures are told, the page explains itself, talks only to itself, and carries its credits', () => {
  assert.match(app, /pass \? 'HELD' : 'FAILED'/);
  assert.match(app, /Failed and kept: /);
  assert.match(app, /Each failure is kept on the record and on this page\./);
  assert.match(html, /A claim that misses its bar is kept and shown as failed\./);
  for (const id of ['result', 'number', 'gatecode', 'rerun', 'what', 'start', 'how', 'blueprint', 'adoption', 'paper', 'business']) assert.match(html, new RegExp('<section id="' + id + '"'), id);
  assert.match(html, /connect-src 'self'/);
  assert.match(html, /the MNIST database of handwritten digits, Y\. LeCun, C\. Cortes and C\. J\. C\. Burges, CC BY-SA 3\.0/);
  assert.match(html, /Powered by the Konomi architecture, created by Thomas Frumkin/);
  assert.match(html, /H\. P\. Luhn's \(1960\)/);
  assert.equal(/£\s?\d|\$\s?\d|per seat|\/mo\b/i.test(html), false, 'no price of ours on the page');
});
