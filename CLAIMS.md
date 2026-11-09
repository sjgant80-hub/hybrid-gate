# hybrid-gate · sealed claims (seal 1, before the code that makes the claims)

Rung 3 of the geometric substrate ladder: **settling where it fits, step-code for exact work, and the gate stays
inspectable code.** Only `src/mnist.mjs` (the data conversion) existed when this file was committed, and it had been
run only on the MNIST training file. Every bar is fixed here. A claim that misses its bar is kept and published as failed.

## The task

Read handwritten **account numbers with a check digit**: 5 digits, the last being the Luhn check digit of the first four.
Every number is assembled from real, isolated handwritten MNIST digits. A reader either returns a number or refers it to
a person.

- **Data:** MNIST (Y. LeCun, C. Cortes, C. J. C. Burges; CC BY-SA 3.0), from Google's public mirror.
  sha256: `train-images-idx3-ubyte.gz` 440fcabf73cc546fa21475e81ea370265605f56be210a4024d2ca8f203523609,
  `train-labels-idx1-ubyte.gz` 3552534a0a558bbed6aed32b30c495cca23d567ec52cac8be1a0730e8010255c,
  `t10k-images-idx3-ubyte.gz` 8d422c7b0a1c1c79245a5bcf07fe86e33eeafee792b84584aec276f5a2dbc4e6,
  `t10k-labels-idx1-ubyte.gz` f7ae60f92e00ec6debd23a6088c31dbd2371eca3ffa0defaefb259924204aec6.
- **Conversion** (`src/mnist.mjs`): grey > 127 is ink; the ink's bounding box is fitted, shape kept and centred, into
  32×32; each 4×4 block's on-pixels give the 8×8 ink grid, 0..16, as the optical digits were made.
- **The cell:** grown by Rung 1's own kernel (sjgant80-hub/settling-cell `src/cell.mjs`, sha256
  590c8307b06148dbfa7c2e4a247336441e150d8235d62783c45efb53190d9101, vendored byte for byte) with Rung 1's sealed
  settings (b=4, k=20, R=64, n=6) on MNIST training rows 0–29,999.
- **Tune numbers** are assembled from training rows 30,000–59,999 (seed 3002). **Held-out numbers** are assembled from
  the 10,000 test digits (seed 3001), read once, after seal 2.
- **Assembly:** shuffle the pool (Fisher–Yates, the estate rng). Walk it in order: take 4 images as the payload, compute
  the Luhn check digit of their labels, then take the next unused image in the walk whose label is that check digit.
  Each image is used at most once. Stop when a needed check digit cannot be found.

## The exact part (step-code)

- **Luhn**, for payload d1 d2 d3 d4 and check c: double d4 and d2 (subtract 9 when the double passes 9), add all four,
  and c = (10 − sum mod 10) mod 10. The number is valid when its check digit equals that.
- **Solve one digit:** given a number with one position unknown, the step-code finds the unique value that makes it
  valid (Luhn's doubling map is one-to-one, so the value is unique for every position).

## The inspectable gate (plain code, a few lines, every decision with its reason)

For each of the 5 digits, the cell settles and reports its class fits. A digit's confidence is the top class's share of
its total fit, compared in whole numbers (100·top ≥ τ·total).

1. A digit with zero fit → **REFER** (no-fit).
2. The read number is valid and every digit's confidence ≥ τ → **ACCEPT**.
3. The read number is valid but some digit's confidence < τ → **REFER** (low confidence).
4. The read number is not valid: take the least confident digit (the first on a tie), solve it with the step-code; if the
   solved value is that digit's second-ranked class and every other digit's confidence ≥ τ → **ACCEPT, REPAIRED**;
   otherwise **REFER** (check failed).

**τ** is chosen on the tune numbers only: the smallest τ in {50, 55, …, 100} whose accepted tune numbers are at least
99.5% exactly right. It is sealed by value in seal 2 before the test digits are read.

## The claims (on the held-out numbers, assembled from the 10,000 test digits)

- **H1 · the step-code is exact.** Luhn check and the one-digit solve are right for every one of the 100,000 five-digit
  strings and every position (an exhaustive test).
- **H2 · the gate is inspectable.** Every held-out decision carries one of the four reasons above; recomputing the
  decision from the reason's rule gives the same verdict for every number; the gate's code is under 40 lines.
- **H3 · precision.** Of the numbers the hybrid accepts, at least 99.0% are exactly right in all 5 digits.
- **H4 · it beats reading alone.** Per number, the hybrid's wrong-accept rate is lower than the settle-only reader's
  error rate (which accepts every number): paired 95% lower bound of (settle-only wrong − hybrid wrong-accept) > 0.
- **H5 · the step-code earns its keep.** Repair adds coverage: paired 95% lower bound of (accepted with repair −
  accepted without repair) > 0. And repaired numbers are at least 95% exactly right.
- **H6 · coverage.** The hybrid accepts at least 40% of the held-out numbers.
- **H7 · deterministic.** The held-out record hashes the same twice, on GitHub's runner and in a browser tab.
- **H8 · the page.** No measured number is typed into `index.html`.
- **H9 · the data.** The four MNIST files and the vendored Rung 1 kernel are byte-identical to the hashes above.
- **G · the gate on the code.** witness v0.6 on this repository's kernels: CLEAN, nothing baselined. CI green.

Bootstrap: 2,000 paired resamples, seed 99; a lower bound is the 2.5th percentile.

## What Rung 3 is not

Not a mesh (Rung 4), not a defence (Rung 5), not on a chip (Rung 7). Numbers are assembled from isolated digits, not
cut from real forms.
