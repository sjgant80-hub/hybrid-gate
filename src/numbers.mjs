// src/numbers.mjs — assembling account numbers from isolated handwritten digits, exactly as sealed: shuffle the pool with
// the estate rng, walk it, take 4 unused images as the payload, then the next unused image in the walk whose label is
// their Luhn check digit. Each image is used at most once; stop when a needed check digit cannot be found.
import { rng } from '../vendor/settling-cell/vendor/seed-library/seedlib.mjs';
import { checkDigit } from './luhn.mjs';

/** order(n, seed) → 0..n−1 in the sealed Fisher–Yates order. */
export function order(n, seed) {
  const r = rng(seed), p = Array.from({ length: n }, (_, j) => j);
  for (let j = n - 1; j >= 1; j--) { const q = Math.floor(r() * (j + 1)); const t = p[j]; p[j] = p[q]; p[q] = t; }
  return p;
}
/** assemble(y, seed) → numbers: { idx: the 5 image indices, digits: their labels }. */
export function assemble(y, seed) {
  const walk = order(y.length, seed), used = new Uint8Array(y.length), out = [];
  let at = 0;
  for (;;) {
    const idx = [];
    while (idx.length !== 4 && at !== walk.length) { const i = walk[at++]; if (!used[i]) { used[i] = 1; idx.push(i); } }
    if (idx.length !== 4) return out;
    const c = checkDigit(idx.map((i) => y[i]));
    let k = at;
    while (k !== walk.length && (used[walk[k]] || y[walk[k]] !== c)) k++;
    if (k === walk.length) return out;
    used[walk[k]] = 1;
    idx.push(walk[k]);
    out.push({ idx, digits: idx.map((i) => y[i]) });
  }
}
export default { order, assemble };
