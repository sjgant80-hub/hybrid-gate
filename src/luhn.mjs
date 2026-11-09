// src/luhn.mjs — the exact part (step-code): the Luhn check digit of a 4-digit payload, the validity of a 5-digit number,
// and the one-digit solve. Plain integer arithmetic; exhaustively tested (claim H1). Sealed first: CLAIMS.md (a1e7f72).
/** dbl(d) → d doubled, less 9 when the double passes 9. */
export const dbl = (d) => (d > 4 ? 2 * d - 9 : 2 * d);
/** checkDigit(p) → the Luhn check digit of payload d1 d2 d3 d4 (d2 and d4 doubled). */
export const checkDigit = (p) => (10 - ((p[0] + dbl(p[1]) + p[2] + dbl(p[3])) % 10)) % 10;
/** valid(n) → true when the 5-digit number's last digit is the check digit of the first four. */
export const valid = (n) => n.length === 5 && checkDigit(n) === n[4];
/** solve(n, pos) → the unique value at pos that makes n valid (−1 if none, which the exhaustive test shows never happens). */
export function solve(n, pos) {
  const m = n.slice();
  for (let v = 0; v !== 10; v++) { m[pos] = v; if (valid(m)) return v; }
  return -1;
}
export default { dbl, checkDigit, valid, solve };
