# Hybrid gate

Live: **https://sjgant80-hub.github.io/hybrid-gate/**

Rung 3 of the geometric ladder: **settling where it fits, step-code for exact work, and the gate stays inspectable
code.** A settling cell reads each digit of a handwritten account number; exact code checks the Luhn check digit and can
repair one doubtful digit; a gate of a few readable lines accepts or refers, always with a reason.

## The result (1,999 held-out numbers built from the 10,000 MNIST test digits, read once)

3 of the 5 measured claims held; 2 failed and are kept. H1 (the step-code is exact on all 100,000 strings) is proven
exhaustively in CI.

| | claim | measured |
|---|---|---|
| ✓ | H2 every decision has a reason that matches it | consistent on all 1,999 |
| ✗ | H3 accepted numbers exactly right ≥ 99% | 88.5% (997 of 1,126) |
| ✓ | H4 fewer wrong numbers let through than reading alone | 129 vs 1,075 wrong (lower bound +45.1 points) |
| ✗ | H5 repairs add coverage and are ≥ 95% right | adds coverage, but only 79 of 170 repairs right |
| ✓ | H6 accepts at least 40% | 56.3% |

The limit is the digit reader (about 85% per digit): two misread digits can cancel in the check, and a repair guesses
wrong when a second digit is also misread. An exploratory margin gate (not a claim) accepted 374 numbers at 96.0%.

## How it was kept honest

1. [`CLAIMS.md`](CLAIMS.md), seal 1 (a1e7f72): the task, the step-code, the gate, the τ rule, every bar.
2. Tuning on training digits found no τ reaching 99.5%. [`AMENDMENT.md`](AMENDMENT.md) (a683987) filled that gap
   before the test digits were read; the gate and the bars were not changed.
3. [`SEAL2.md`](SEAL2.md) (09c6e67): the cell, τ = 50 and the code frozen by hash.
4. The test digits read once (`data/record.json`).

## Re-derive it

```bash
node --test test/hybrid.test.mjs test/page.test.mjs
node tools/tune.mjs --check
node tools/run.mjs --check
```

Data: MNIST (LeCun, Cortes, Burges), CC BY-SA 3.0. Built on [settling-cell](https://github.com/sjgant80-hub/settling-cell)
(Rung 1), vendored byte for byte. Powered by the Konomi architecture, created by Thomas Frumkin. MIT licence for the
code; credits in [`NOTICE`](NOTICE).
