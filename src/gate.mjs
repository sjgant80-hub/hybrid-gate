// src/gate.mjs — the hybrid: the settling cell reads each digit; the gate below, a few lines of plain code, decides.
// Every decision carries its reason (claim H2). Sealed first: CLAIMS.md (a1e7f72).
import C from '../vendor/settling-cell/src/cell.mjs';
import { valid, solve } from './luhn.mjs';

/** readDigit(c, ink) → the settled answer, the top and second-ranked classes, the top class's fit and the total fit. */
export function readDigit(c, ink) {
  const st = C.settle(c, C.encode(ink, 4)), fits = C.classFit(c, st.d);
  const rank = fits.map((f, k) => k).sort((a, b) => fits[b] - fits[a] || a - b);
  return { answer: st.answer, second: rank[1], top: fits[rank[0]], total: fits.reduce((s, f) => s + f, 0) };
}
/** confident(r, tau) → the top class holds at least tau% of the digit's fit (compared in whole numbers). */
export const confident = (r, tau) => r.total > 0 && 100 * r.top >= tau * r.total;

// ── THE GATE ── (H2: under 40 lines, every decision with its reason)
export function decide(reads, tau) {
  const n = reads.map((r) => r.answer);
  if (reads.some((r) => r.answer < 0)) return { verdict: 'refer', reason: 'no-fit', number: n };
  if (valid(n)) return reads.every((r) => confident(r, tau)) ? { verdict: 'accept', reason: 'ok', number: n } : { verdict: 'refer', reason: 'low-confidence', number: n };
  let worst = 0;
  for (let i = 1; i !== reads.length; i++) if (reads[i].top / reads[i].total < reads[worst].top / reads[worst].total) worst = i;
  const v = solve(n, worst), others = reads.every((r, i) => i === worst || confident(r, tau));
  if (v === reads[worst].second && others) { const m = n.slice(); m[worst] = v; return { verdict: 'accept', reason: 'repaired', number: m }; }
  return { verdict: 'refer', reason: 'check-failed', number: n };
}
// ── END OF THE GATE ──

export default { readDigit, confident, decide };
