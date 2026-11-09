# Amendment 1 to seal 1, made before the test digits were read

`CLAIMS.md` (seal 1, a1e7f72) is unchanged and stays the contract. **No bar moved, no claim was reworded, the gate
was not changed, and the MNIST test file had not been read.**

## What tuning showed

The sealed τ rule asks for the smallest τ in {50, …, 100} whose accepted tune numbers are at least 99.5% exactly right.
On the 5,998 tune numbers, **no τ reaches it**. The best is τ = 50: 3,108 accepted (51.8%) at 89.29% exactly right. The
table is in `data/tune.json`. Two causes, both measured on tune data:

- **Repairs are about half wrong** (201 of 422 right at τ = 50): when one digit is misread, often a second one is too.
- **The sealed confidence signal is weak.** On 10,000 tune digits, the top class's share of the *settled* fit tells a
  right digit from a wrong one at AUC 0.678. The margin between the top two classes *before* settling does better, at
  AUC 0.834. Settling collapses an ambiguous digit into one well and erases the uncertainty the gate needs.

## The change

The sealed rule did not say what to do when no τ reaches the target. This amendment fills that gap and nothing else:
**if no τ reaches 99.5%, τ is the one with the highest tune precision (the smaller on a tie).** That gives τ = 50.

## What is shown beside it, and is not a claim

A gate whose confidence is the pre-settle margin was designed after the tuning above. It is run once on the held-out
numbers, with its τ chosen on the tune numbers by the same rule, and shown on the page as an exploratory comparison. It
is not judged against any bar.
