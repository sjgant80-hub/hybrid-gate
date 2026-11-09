// src/explore.mjs — NOT a sealed claim (AMENDMENT.md). A gate whose confidence is the margin between the top two classes
// BEFORE settling, designed after tuning showed the settled fit share is a weak signal. It reads the same settled answer
// and uses the same rules as the sealed gate; only the confidence and the second-ranked class come from the unsettled read.
import C from '../vendor/settling-cell/src/cell.mjs';
import { valid, solve } from './luhn.mjs';

/** readMargin(c, ink) → the settled answer, and from the unsettled read: the top two classes' fits and the runner-up. */
export function readMargin(c, ink) {
  const bits = C.encode(ink, 4), st = C.settle(c, bits), f0 = C.classFit(c, C.distances(c, bits));
  const rank = f0.map((f, k) => k).sort((a, b) => f0[b] - f0[a] || a - b);
  return { answer: st.answer, second: rank[1], f1: f0[rank[0]], f2: f0[rank[1]] };
}
export const sure = (r, tau) => r.f1 > 0 && 100 * (r.f1 - r.f2) >= tau * r.f1;
export function decideMargin(reads, tau) {
  const n = reads.map((r) => r.answer);
  if (reads.some((r) => r.answer < 0)) return { verdict: 'refer', reason: 'no-fit', number: n };
  if (valid(n)) return reads.every((r) => sure(r, tau)) ? { verdict: 'accept', reason: 'ok', number: n } : { verdict: 'refer', reason: 'low-confidence', number: n };
  let worst = 0;
  for (let i = 1; i !== reads.length; i++) if ((reads[i].f1 - reads[i].f2) / reads[i].f1 < (reads[worst].f1 - reads[worst].f2) / reads[worst].f1) worst = i;
  const v = solve(n, worst);
  if (v === reads[worst].second && reads.every((r, i) => i === worst || sure(r, tau))) { const m = n.slice(); m[worst] = v; return { verdict: 'accept', reason: 'repaired', number: m }; }
  return { verdict: 'refer', reason: 'check-failed', number: n };
}
export default { readMargin, sure, decideMargin };
