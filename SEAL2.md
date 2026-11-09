# Seal 2 · the cell and τ frozen, before the test digits are read

Committed after seal 1 (`CLAIMS.md`, a1e7f72) and amendment 1 (`AMENDMENT.md`, a683987). **No code has read the MNIST
test file.** The next commit runs `tools/run.mjs` once, which refuses to run unless this file names the cell below and
states both τ values.

## What is frozen

- **The cell:** `data/cell.txt`, sha256 **8fa097afba765e457729a25c57c1ca74bab02de49a6b6d9d1d6c9366d637f0f9**, grown
  by Rung 1's kernel with Rung 1's settings (b=4, k=20, R=64, n=6) on MNIST training rows 0–29,999.
- **The sealed gate:** τ = 50 , by amendment 1's fallback. No τ met 99.5% on the 5,998 tune numbers; τ = 50 had the
  highest tune precision, 89.29% (3,108 accepted). The table is in `data/tune.json`.
- **The exploratory margin gate (not a claim):** exploratory τ = 85 , chosen on the same tune numbers by the same
  rule (96.36% precision on 1,017 accepted).

## The code, frozen here

| file | sha256 | mutation gate (witness v0.6) |
|---|---|---|
| `src/mnist.mjs` | 95b1bcd452d0dad91c8d9afc4e123e6676cad3b27b6adee1d7cea32f584939b7 | 30 of 30 caught, 0 baselined |
| `src/luhn.mjs` | c42b81e47002b5e61e9106dac6b7ad59716f816def8e6fb4622e805e402f1bc9 | 5 of 5 caught, 0 baselined |
| `src/numbers.mjs` | 6146a3fd0869c55cae4059fdd157f064bcc82d66d7f70e96329f7a2f6a66a64f | 12 of 12 caught, 0 baselined |
| `src/gate.mjs` | 308292b498a3253975f00df7801ab114f504e2a5036ef97534ff46848566fc96 | 11 of 11 caught, 0 baselined |
| `src/explore.mjs` | 1b63c801202ee91ac632f964f3a477550d87febad28b2d7d2c8408281cc4949e | 11 of 11 caught, 0 baselined |
| `src/run.mjs` | fd259936abdcd182936ad761dcc0300a2e4319de65768dc169da82d351009613 | 42 of 42 caught, 0 baselined |

`src/mnist.mjs` was restructured after seal 1 to remove mutants no test could kill (bounds that can never matter);
its output is unchanged, and `node tools/tune.mjs --check` re-derives the cell and both τ values byte for byte.
