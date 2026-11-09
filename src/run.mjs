// src/run.mjs — choosing τ on the tune numbers by the sealed rule, and the held-out evaluation: the settle-only reader,
// the check without repair, and the hybrid gate, number by number, with every claim judged against its sealed bar.
// Pure and browser-safe: it takes parsed digits; the page's worker runs this same code and must reproduce the hash.
import C from '../vendor/settling-cell/src/cell.mjs';
import { sha256Hex } from '../vendor/settling-cell/vendor/seed-library/sha256.mjs';
import { round6 } from '../vendor/settling-cell/vendor/seed-library/seedlib.mjs';
import N from './numbers.mjs';
import G from './gate.mjs';
import { valid } from './luhn.mjs';
import X from './explore.mjs';

export const TAUS = Object.freeze([50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);
export const SEEDS = Object.freeze({ heldOut: 3001, tune: 3002, boot: 99 });
export const SETTINGS = Object.freeze({ b: 4, k: 20, R: 64, n: 6, grow: 30000 });
export const REASONS = Object.freeze(['ok', 'repaired', 'no-fit', 'low-confidence', 'check-failed']);

/** growCell(train) → the cell grown by Rung 1's kernel with Rung 1's settings on training rows 0–29,999, as cell text. */
export function growCell(train) {
  const s = C.grow(train.x.slice(0, SETTINGS.grow), train.y.slice(0, SETTINGS.grow), { b: SETTINGS.b, k: SETTINGS.k });
  return C.cellText(s, SETTINGS.R, SETTINGS.n);
}
/** readAll(c, d, nums) → every number's five digit reads. */
export const readAll = (c, d, nums) => nums.map((m) => m.idx.map((i) => G.readDigit(c, d.x[i])));
/** chooseTau(reads, nums, decide) → { tau, met, table }: the smallest τ whose accepted tune numbers are at least 99.5%
 *  exactly right; if none is (amendment 1), the τ with the highest tune precision, the smaller on a tie. */
export function chooseTau(reads, nums, decide = G.decide) {
  const table = TAUS.map((tau) => {
    let acc = 0, right = 0;
    for (let j = 0; j !== nums.length; j++) { const g = decide(reads[j], tau); if (g.verdict === 'accept') { acc++; if (g.number.join('') === nums[j].digits.join('')) right++; } }
    return { tau, acc, right };
  });
  const met = table.find((t) => t.acc > 0 && 1000 * t.right >= 995 * t.acc);
  if (met) return { tau: met.tau, met: true, table };
  let best = table[0];
  for (const t of table) if (t.right * best.acc > best.right * t.acc) best = t;
  return { tau: best.tau, met: false, table };
}
/** tune(train) → the cell text and τ, from the training file only. */
export function tune(train) {
  const cellText = growCell(train), f = C.parseCell(cellText), c = C.cell(f.shape, { R: f.R, n: f.n });
  const pool = { x: train.x.slice(SETTINGS.grow), y: train.y.slice(SETTINGS.grow) }, nums = N.assemble(pool.y, SEEDS.tune);
  const reads = readAll(c, pool, nums), readsM = nums.map((m) => m.idx.map((i) => X.readMargin(c, pool.x[i])));
  return { cellText, ...chooseTau(reads, nums), explore: chooseTau(readsM, nums, X.decideMargin), tuneNumbers: nums.length };
}

const sum = (v) => v.reduce((s, a) => s + a, 0);
/** agrees(g) → the verdict matches its reason (accept exactly for ok and repaired), and an ok number really is valid. */
export const agrees = (g) => (g.verdict === 'accept') === (g.reason === 'ok' || g.reason === 'repaired') && (g.reason !== 'ok' || valid(g.number));
/** evaluate({ test, cellText, tau, exploreTau }) → the held-out record (the exploratory gate's numbers beside, not judged). */
export function evaluate({ test, cellText, tau, exploreTau }) {
  const f = C.parseCell(cellText), c = f && C.cell(f.shape, { R: f.R, n: f.n });
  if (!c || !test.x.length || !TAUS.includes(tau) || !TAUS.includes(exploreTau)) return null;
  const nums = N.assemble(test.y, SEEDS.heldOut), reads = readAll(c, test, nums), lines = [];
  const settleWrong = [], hybridWrong = [], withRepair = [], withoutRepair = [], reasons = Object.fromEntries(REASONS.map((r) => [r, 0]));
  let accepted = 0, right = 0, repaired = 0, repairedRight = 0, inconsistent = 0;
  nums.forEach((m, j) => {
    const truth = m.digits.join(''), read = reads[j].map((r) => r.answer).join(''), g = G.decide(reads[j], tau);
    const ok = g.verdict === 'accept' && g.number.join('') === truth;
    settleWrong.push(read === truth ? 0 : 1);
    hybridWrong.push(g.verdict === 'accept' && !ok ? 1 : 0);
    withRepair.push(g.verdict === 'accept' ? 1 : 0);
    withoutRepair.push(g.reason === 'ok' ? 1 : 0);
    reasons[g.reason]++;
    inconsistent += agrees(g) ? 0 : 1;
    if (g.verdict === 'accept') { accepted++; if (ok) right++; }
    if (g.reason === 'repaired') { repaired++; if (ok) repairedRight++; }
    lines.push(j + ' ' + m.idx.join(',') + ' ' + truth + ' ' + read + ' ' + g.verdict + ' ' + g.reason + ' ' + g.number.join(''));
  });
  let xAcc = 0, xRight = 0;
  nums.forEach((m) => { const g = X.decideMargin(m.idx.map((i) => X.readMargin(c, test.x[i])), exploreTau); if (g.verdict === 'accept') { xAcc++; if (g.number.join('') === m.digits.join('')) xRight++; } });
  const low = (a, b) => round6(C.pairedLow(a, b, 2000, SEEDS.boot));
  return {
    explore: { tau: exploreTau, accepted: xAcc, right: xRight, note: 'not a sealed claim (AMENDMENT.md)' },
    cellHash: sha256Hex(cellText), tau, numbers: nums.length, digits: test.x.length,
    settleOnlyRight: nums.length - sum(settleWrong), accepted, right, repaired, repairedRight, acceptedNoRepair: sum(withoutRepair), reasons, consistent: inconsistent === 0,
    lows: { H4: low(settleWrong, hybridWrong), H5: low(withRepair, withoutRepair) },
    hash: sha256Hex(lines.join('\n') + '\n'),
  };
}

/** verdicts(r) → each sealed claim beside its bar, judged on whole counts where the bar is a share. */
export function verdicts(r) {
  const n = r.numbers;
  return [
    { id: 'H2', what: 'every decision carries a reason, and verdict and reason agree', measured: r.consistent, bar: 'true', pass: r.consistent && sum(Object.values(r.reasons)) === n },
    { id: 'H3', what: 'share of accepted numbers exactly right', measured: r.accepted ? round6(r.right / r.accepted) : 0, bar: 'at least 0.99', pass: r.accepted > 0 && 100 * r.right >= 99 * r.accepted },
    { id: 'H4', what: 'settle-only error rate minus the hybrid\'s wrong-accept rate: 95% lower bound', measured: r.lows.H4, bar: 'above 0', pass: r.lows.H4 > 0 },
    { id: 'H5', what: 'coverage added by repair: lower bound, and the share of repairs exactly right', measured: [r.lows.H5, r.repaired ? round6(r.repairedRight / r.repaired) : 0], bar: 'above 0, and at least 0.95', pass: r.lows.H5 > 0 && 100 * r.repairedRight >= 95 * r.repaired },
    { id: 'H6', what: 'share of held-out numbers the hybrid accepts', measured: round6(r.accepted / n), bar: 'at least 0.4', pass: 10 * r.accepted >= 4 * n },
  ];
}

export default { TAUS, SEEDS, SETTINGS, REASONS, agrees, growCell, readAll, chooseTau, tune, evaluate, verdicts };
