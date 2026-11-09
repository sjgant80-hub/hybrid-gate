// The hybrid's kernels, held to the sealed text. Fixtures come from the MNIST TRAINING file only; the test file is read
// once, by tools/run.mjs, after seal 2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import M from '../src/mnist.mjs';
import Lh from '../src/luhn.mjs';
import N from '../src/numbers.mjs';
import G from '../src/gate.mjs';
import X from '../src/explore.mjs';
import R from '../src/run.mjs';
import C from '../vendor/settling-cell/src/cell.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const claims = read('CLAIMS.md').replace(/\s+/g, ' ');
const raw = (f) => new Uint8Array(gunzipSync(readFileSync(new URL('../data/mnist/' + f, import.meta.url))));
const IMG = raw('train-images-idx3-ubyte.gz'), LAB = raw('train-labels-idx1-ubyte.gz');
const sub = (from, n) => {
  const i = new Uint8Array(16 + n * 784); i.set(IMG.subarray(0, 16)); new DataView(i.buffer).setUint32(4, n); i.set(IMG.subarray(16 + from * 784, 16 + (from + n) * 784), 16);
  const l = new Uint8Array(8 + n); l.set(LAB.subarray(0, 8)); new DataView(l.buffer).setUint32(4, n); l.set(LAB.subarray(8 + from, 8 + from + n), 8);
  return { i, l, d: M.parse(i, l) };
};
const grow = sub(0, 3000).d, pool = sub(40000, 600).d;
const cellText = R.growCell(grow), f = C.parseCell(cellText), cell = C.cell(f.shape, { R: f.R, n: f.n });

test('the sealed numbers in the code are the ones CLAIMS.md and AMENDMENT.md state', () => {
  for (const s of ['(b=4, k=20, R=64, n=6) on MNIST training rows 0–29,999', 'training rows 30,000–59,999 (seed 3002)', 'test digits (seed 3001)', 'the smallest τ in {50, 55, …, 100}', 'at least 99.0% are exactly right', 'at least 95% exactly right', 'at least 40% of the held-out numbers', '2,000 paired resamples, seed 99', 'grey > 127 is ink', 'double d4 and d2'])
    assert.ok(claims.includes(s), 'CLAIMS.md says: ' + s);
  assert.ok(read('AMENDMENT.md').includes('if no τ reaches 99.5%, τ is the one with the highest tune precision (the smaller on a tie)'));
  assert.deepEqual(R.TAUS, [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);
  assert.deepEqual(R.SEEDS, { heldOut: 3001, tune: 3002, boot: 99 });
  assert.deepEqual(R.SETTINGS, { b: 4, k: 20, R: 64, n: 6, grow: 30000 });
  assert.deepEqual(R.REASONS, ['ok', 'repaired', 'no-fit', 'low-confidence', 'check-failed']);
  assert.deepEqual([M.SRC, M.BOX, M.GRID, M.CELL, M.CUT], [28, 32, 8, 4, 127]);
  for (const o of [R.TAUS, R.SEEDS, R.SETTINGS, R.REASONS]) assert.ok(Object.isFrozen(o));
});

test('MNIST conversion: threshold, bounding box kept square and centred, 4×4 counts; malformed files give nothing', () => {
  const img = new Uint8Array(784);
  assert.deepEqual(M.inkOf(img), new Array(64).fill(0), 'a blank image has no ink');
  img[0] = 128;
  assert.equal(M.inkOf(img)[0], 16, 'one ink pixel fills the whole 32×32 box: every block full');
  assert.ok(M.inkOf(img).every((v) => v === 16));
  img[0] = 127;
  assert.equal(M.inkOf(img)[0], 0, '127 is not ink');
  const bar = new Uint8Array(784); for (let r = 4; r !== 24; r++) bar[r * 28 + 14] = 200;
  const ink = M.inkOf(bar);
  assert.equal(ink.reduce((a, b) => a + b, 0), 32, 'a 20×1 bar scales to 32 tall and lands in exactly one column');
  assert.ok(ink.every((v, p) => (p % 8 === 3 || p % 8 === 4 ? true : v === 0)), 'centred: only the two middle columns of blocks');
  assert.equal(pool.x.length, 600);
  assert.deepEqual(pool.x[0], [0, 0, 4, 8, 8, 16, 16, 0, 0, 7, 16, 13, 14, 16, 10, 0, 0, 0, 0, 0, 12, 14, 0, 0, 0, 0, 0, 5, 16, 6, 0, 0, 0, 0, 0, 14, 12, 0, 0, 0, 0, 0, 8, 15, 0, 0, 0, 0, 0, 8, 16, 2, 0, 0, 0, 0, 0, 14, 6, 0, 0, 0, 0, 0]);
  const { i, l } = sub(0, 5);
  assert.equal(M.parse(i, l).x.length, 5);
  assert.deepEqual(M.parse(i.slice(0, 100), l), { x: [], y: [] });
  assert.deepEqual(M.parse(i, l.slice(0, 7)), { x: [], y: [] });
  assert.deepEqual(M.parse(null, l), { x: [], y: [] });
  const bad = i.slice(); bad[3] = 4; assert.deepEqual(M.parse(bad, l), { x: [], y: [] }, 'wrong magic');
  const badl = l.slice(); badl[3] = 0; assert.deepEqual(M.parse(i, badl), { x: [], y: [] });
  const cnt = l.slice(); new DataView(cnt.buffer).setUint32(4, 4); assert.deepEqual(M.parse(i, cnt), { x: [], y: [] }, 'counts disagree');
  const sz = i.slice(); new DataView(sz.buffer).setUint32(8, 27); assert.deepEqual(M.parse(sz, l), { x: [], y: [] }, 'not 28×28');
  const sz2 = i.slice(); new DataView(sz2.buffer).setUint32(12, 27); assert.deepEqual(M.parse(sz2, l), { x: [], y: [] });
});

test('H1: Luhn and the one-digit solve are exact on every five-digit string and every position', () => {
  assert.deepEqual([0, 1, 4, 5, 9].map(Lh.dbl), [0, 2, 8, 1, 9]);
  assert.equal(Lh.checkDigit([7, 9, 9, 2]), 1);
  assert.equal(Lh.checkDigit([0, 0, 0, 0]), 0);
  assert.equal(Lh.checkDigit([0, 0, 0, 1]), 8);
  assert.equal(Lh.valid([7, 9, 9, 2, 1]), true);
  assert.equal(Lh.valid([7, 9, 9, 2, 2]), false);
  assert.equal(Lh.valid([7, 9, 9, 2]), false);
  let n = 0;
  for (let a = 0; a !== 100000; a++) {
    const d = String(a).padStart(5, '0').split('').map(Number);
    for (let p = 0; p !== 5; p++) {
      const v = Lh.solve(d, p), m = d.slice(); m[p] = v;
      assert.ok(v >= 0 && Lh.valid(m));
      let cnt = 0; for (let w = 0; w !== 10; w++) { const q = d.slice(); q[p] = w; if (Lh.valid(q)) cnt++; }
      assert.equal(cnt, 1); n++;
    }
  }
  assert.equal(n, 500000);
  assert.equal(Lh.solve([1, 2, 3, 4, 5, 6], 0), -1, 'a six-digit string is never valid');
});

test('assembly: the sealed walk, each image once, every check digit right', () => {
  assert.deepEqual(N.order(5, 1), N.order(5, 1));
  assert.deepEqual([...N.order(10, 7)].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(N.order(1, 7), [0]);
  assert.deepEqual(N.order(0, 7), []);
  assert.ok([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some((s) => N.order(2, s)[0] === 1), 'the last swap (j = 1) happens for some seed');
  const nums = N.assemble(pool.y, 3002);
  assert.equal(nums.length, 113);
  assert.deepEqual(nums.slice(0, 2), [{ idx: [213, 200, 35, 47, 389], digits: [8, 0, 3, 9, 0] }, { idx: [176, 111, 567, 523, 13], digits: [6, 8, 5, 4, 4] }]);
  const all = nums.flatMap((m) => m.idx);
  assert.equal(new Set(all).size, all.length, 'no image twice');
  assert.ok(nums.every((m) => Lh.valid(m.digits) && m.digits.every((d, k) => d === pool.y[m.idx[k]])));
  assert.deepEqual(N.assemble([1, 2, 3], 1), [], 'too few images for a number');
  assert.deepEqual(N.assemble([1, 1, 1, 1, 5], 1), [], 'the check digit 2 is nowhere');
  assert.equal(N.assemble([0, 0, 0, 0, 0], 1).length, 1, 'payload 0000 has check digit 0');
});

test('the gate: each rule and its reason, on hand-made reads', () => {
  const r = (answer, top = 100, total = 100, second = 0) => ({ answer, top, total, second });
  const ok = [r(7), r(9), r(9), r(2), r(1)];
  assert.deepEqual(G.decide(ok, 50), { verdict: 'accept', reason: 'ok', number: [7, 9, 9, 2, 1] });
  assert.deepEqual(G.decide([r(7), r(-1), r(9), r(2), r(1)], 50).reason, 'no-fit');
  assert.deepEqual(G.decide([r(7), r(9, 49, 100), r(9), r(2), r(1)], 50).reason, 'low-confidence');
  assert.deepEqual(G.decide([r(7), r(9, 50, 100), r(9), r(2), r(1)], 50).reason, 'ok', 'exactly τ% is confident');
  assert.deepEqual(G.decide([r(7), r(9, 60, 100, 9), r(9), r(3, 50, 100, 2), r(1)], 50), { verdict: 'accept', reason: 'repaired', number: [7, 9, 9, 2, 1] }, 'the least confident digit is solved to its runner-up');
  assert.equal(G.decide([r(7), r(9, 60, 100), r(9), r(3, 50, 100, 4), r(1)], 50).reason, 'check-failed', 'the solved value is not the runner-up');
  assert.equal(G.decide([r(7), r(9, 40, 100), r(9), r(3, 30, 100, 2), r(1)], 50).reason, 'check-failed', 'another digit is unsure');
  assert.deepEqual(G.decide([r(3, 50, 100, 7), r(9), r(9), r(2), r(1, 50, 100)], 50), { verdict: 'accept', reason: 'repaired', number: [7, 9, 9, 2, 1] }, 'the first least-confident digit on a tie');
  assert.deepEqual(G.decide([r(7), r(9), r(9), r(3, 40, 100, 2), r(1)], 50), { verdict: 'accept', reason: 'repaired', number: [7, 9, 9, 2, 1] }, 'only the solved digit may be under τ');
  assert.equal(G.confident(r(1, 0, 0), 0), false, 'no fit is never confident');
  assert.equal(G.confident(r(1, 1, 2), 50), true);
  assert.equal(G.confident(r(1, 1, 2), 51), false);
  const d0 = G.readDigit(cell, pool.x[0]);
  assert.deepEqual(d0, { answer: 7, second: 9, top: 71695552325, total: 76585088216 });
  const src = read('src/gate.mjs'), body = src.slice(src.indexOf('// ── THE GATE ──'), src.indexOf('// ── END OF THE GATE ──'));
  assert.ok(body.split('\n').length < 40, 'the gate is under 40 lines');
});

test('the exploratory margin gate (not a claim) reads the unsettled margin', () => {
  const m = X.readMargin(cell, pool.x[0]);
  assert.equal(m.answer, 7);
  assert.ok(m.f1 >= m.f2 && m.f2 >= 0);
  assert.equal(X.sure({ f1: 100, f2: 15 }, 85), true);
  assert.equal(X.sure({ f1: 100, f2: 16 }, 85), false);
  assert.equal(X.sure({ f1: 0, f2: 0 }, 0), false);
  const s = (answer, f1 = 100, f2 = 0, second = 0) => ({ answer, f1, f2, second });
  assert.equal(X.decideMargin([s(7), s(9), s(9), s(2), s(1)], 85).reason, 'ok');
  assert.equal(X.decideMargin([s(-1), s(9), s(9), s(2), s(1)], 85).reason, 'no-fit');
  assert.equal(X.decideMargin([s(7), s(9, 100, 50), s(9), s(2), s(1)], 85).reason, 'low-confidence');
  assert.deepEqual(X.decideMargin([s(7), s(9), s(9), s(3, 100, 60, 2), s(1)], 85).number, [7, 9, 9, 2, 1]);
  assert.equal(X.decideMargin([s(7), s(9), s(9), s(3, 100, 60, 4), s(1)], 85).reason, 'check-failed');
  assert.deepEqual(X.decideMargin([s(3, 100, 60, 7), s(9), s(9), s(2), s(1, 100, 60)], 30), { verdict: 'accept', reason: 'repaired', number: [7, 9, 9, 2, 1] }, 'the first of two equally unsure digits is solved');
});

test('agrees: a verdict must match its reason, and an ok number must be valid', () => {
  assert.equal(R.agrees({ verdict: 'accept', reason: 'ok', number: [7, 9, 9, 2, 1] }), true);
  assert.equal(R.agrees({ verdict: 'accept', reason: 'repaired', number: [7, 9, 9, 2, 1] }), true);
  assert.equal(R.agrees({ verdict: 'accept', reason: 'check-failed', number: [7, 9, 9, 2, 1] }), false);
  assert.equal(R.agrees({ verdict: 'refer', reason: 'ok', number: [7, 9, 9, 2, 1] }), false);
  assert.equal(R.agrees({ verdict: 'refer', reason: 'repaired', number: [7, 9, 9, 2, 1] }), false);
  assert.equal(R.agrees({ verdict: 'refer', reason: 'no-fit', number: [7, 9, 9, 2, 1] }), true);
  assert.equal(R.agrees({ verdict: 'accept', reason: 'ok', number: [7, 9, 9, 2, 2] }), false, 'an ok number that fails the check');
  assert.equal(R.agrees({ verdict: 'refer', reason: 'low-confidence', number: [7, 9, 9, 2, 2] }), true);
});

test('tuning and the held-out evaluation, number for number on a training-file fixture', () => {
  const nums = N.assemble(pool.y, 3002), reads = R.readAll(cell, pool, nums), ch = R.chooseTau(reads, nums);
  assert.deepEqual([ch.tau, ch.met], [95, false]);
  assert.deepEqual(ch.table.slice(0, 3), [{ tau: 50, acc: 41, right: 31 }, { tau: 55, acc: 41, right: 31 }, { tau: 60, acc: 41, right: 31 }]);
  assert.deepEqual(R.chooseTau(reads, nums, () => ({ verdict: 'accept', number: [0, 0, 0, 0, 0] })).tau, 50, 'all tied at zero: the smallest τ');
  const perfect = (rs, tau) => (tau >= 70 ? { verdict: 'accept', number: [] } : { verdict: 'refer', number: [] });
  const pnums = [{ digits: [] }];
  assert.deepEqual(R.chooseTau([[]], pnums, perfect).tau, 70, 'the smallest τ meeting 99.5%');
  assert.equal(R.chooseTau([[]], pnums, perfect).met, true);
  const edge = Array.from({ length: 200 }, (_, j) => ({ digits: j === 0 ? [1] : [] })), all = () => ({ verdict: 'accept', number: [] });
  assert.deepEqual([R.chooseTau(edge.map(() => []), edge, all).tau, R.chooseTau(edge.map(() => []), edge, all).met], [50, true], '199 of 200 is exactly 99.5%: it meets the target');
  const readsM = nums.map((m) => m.idx.map((i) => X.readMargin(cell, pool.x[i])));
  assert.deepEqual([R.chooseTau(readsM, nums, X.decideMargin).tau, R.chooseTau(readsM, nums, X.decideMargin).met], [75, true]);
  const r = R.evaluate({ test: pool, cellText, tau: 50, exploreTau: 85 });
  assert.deepEqual([r.numbers, r.digits, r.settleOnlyRight, r.accepted, r.right, r.repaired, r.repairedRight, r.acceptedNoRepair], [115, 600, 32, 39, 34, 4, 2, 35]);
  assert.deepEqual(r.reasons, { ok: 35, repaired: 4, 'no-fit': 4, 'low-confidence': 0, 'check-failed': 72 });
  assert.deepEqual(r.lows, { H4: 0.591304, H5: 0.008696 });
  assert.deepEqual(r.explore, { tau: 85, accepted: 16, right: 14, note: 'not a sealed claim (AMENDMENT.md)' });
  assert.equal(r.consistent, true);
  assert.equal(r.hash, '2fa501f6c5243e9d15924188f5485be2a6b87b3c9499a25228169d87a7653f91');
  assert.equal(r.cellHash.slice(0, 12), 'd0157c33ae16');
  assert.equal(R.evaluate({ test: pool, cellText, tau: 51, exploreTau: 85 }), null, 'τ must be in the sealed grid');
  assert.equal(R.evaluate({ test: pool, cellText, tau: 50, exploreTau: 1 }), null);
  assert.equal(R.evaluate({ test: pool, cellText: 'nope', tau: 50, exploreTau: 85 }), null);
  assert.equal(R.evaluate({ test: { x: [], y: [] }, cellText, tau: 50, exploreTau: 85 }), null);
});

const rec = (o = {}) => ({ numbers: 100, accepted: 50, right: 50, repaired: 20, repairedRight: 19, consistent: true, reasons: { ok: 30, repaired: 20, 'no-fit': 10, 'low-confidence': 10, 'check-failed': 30 }, lows: { H4: 0.0001, H5: 0.0001 }, ...o });
test('verdicts: every bar strict or inclusive exactly as sealed, on whole counts', () => {
  const pass = (r) => Object.fromEntries(R.verdicts(r).map((v) => [v.id, v.pass]));
  assert.deepEqual(pass(rec()), { H2: true, H3: true, H4: true, H5: true, H6: true });
  const fail = (o) => Object.entries(pass(rec(o))).filter(([, v]) => !v).map(([k]) => k);
  assert.deepEqual(fail({ consistent: false }), ['H2']);
  assert.deepEqual(fail({ reasons: { ok: 30, repaired: 20, 'no-fit': 10, 'low-confidence': 10, 'check-failed': 29 } }), ['H2'], 'a number without a reason');
  assert.deepEqual(fail({ right: 49 }), ['H3'], '49 of 50 is 98%');
  assert.deepEqual(fail({ accepted: 100, right: 99 }), [], '99 of 100 is exactly 99%');
  assert.deepEqual(fail({ accepted: 0, right: 0, repaired: 0, repairedRight: 0 }), ['H3', 'H6']);
  assert.deepEqual(fail({ lows: { H4: 0, H5: 0.0001 } }), ['H4']);
  assert.deepEqual(fail({ lows: { H4: 0.0001, H5: 0 } }), ['H5']);
  assert.deepEqual(fail({ repairedRight: 18 }), ['H5'], '18 of 20 is 90%');
  assert.deepEqual(fail({ accepted: 40, right: 40 }), [], 'exactly 40% coverage');
  assert.deepEqual(fail({ accepted: 39, right: 39 }), ['H6']);
  const v = R.verdicts(rec());
  assert.deepEqual(v.map((x) => x.bar), ['true', 'at least 0.99', 'above 0', 'above 0, and at least 0.95', 'at least 0.4']);
  assert.deepEqual(v.map((x) => x.measured), [true, 1, 0.0001, [0.0001, 0.95], 0.5]);
  assert.deepEqual(R.verdicts(rec({ accepted: 0, right: 0, repaired: 0, repairedRight: 0 })).map((x) => x.measured).slice(1, 4), [0, 0.0001, [0.0001, 0]]);
  assert.ok(v.every((x) => typeof x.what === 'string' && x.what.length > 10));
});
