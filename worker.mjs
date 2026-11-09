// worker.mjs — the reader, off the page's thread. It fetches the MNIST test files from this site, decompresses them in the
// browser, and answers: 'rerun' → src/run.mjs's evaluate (the held-out record and its hash, claim H7); 'number' → one
// held-out number: its five digits, what the cell read, and the gate's decision with its reason.
import M from './src/mnist.mjs';
import R from './src/run.mjs';
import N from './src/numbers.mjs';
import G from './src/gate.mjs';
import C from './vendor/settling-cell/src/cell.mjs';

const bytes = async (p) => { const r = await fetch(new URL(p, import.meta.url)); if (!r.ok) throw new Error(p + ' answered ' + r.status); return new Uint8Array(await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()); };
const text = async (p) => { const r = await fetch(new URL(p, import.meta.url)); if (!r.ok) throw new Error(p + ' answered ' + r.status); return r.text(); };
let S = null;
async function load() {
  if (S) return S;
  const [img, lab, cellText, tune] = await Promise.all([bytes('./data/mnist/t10k-images-idx3-ubyte.gz'), bytes('./data/mnist/t10k-labels-idx1-ubyte.gz'), text('./data/cell.txt'), text('./data/tune.json')]);
  const test = M.parse(img, lab), t = JSON.parse(tune), f = C.parseCell(cellText);
  S = { test, cellText, tau: t.tau, exploreTau: t.explore.tau, cell: C.cell(f.shape, { R: f.R, n: f.n }), nums: N.assemble(test.y, R.SEEDS.heldOut) };
  return S;
}

self.onmessage = async (m) => {
  const q = m.data || {};
  try {
    const s = await load();
    if (q.do === 'rerun') {
      const t = performance.now(), record = R.evaluate({ test: s.test, cellText: s.cellText, tau: s.tau, exploreTau: s.exploreTau });
      self.postMessage({ id: q.id, ok: !!record, record, ms: Math.round(performance.now() - t), why: record ? '' : 'the record did not compute' });
      return;
    }
    if (q.do === 'number') {
      const j = (q.j >>> 0) % s.nums.length, num = s.nums[j], reads = num.idx.map((i) => G.readDigit(s.cell, s.test.x[i]));
      self.postMessage({ id: q.id, ok: true, j, count: s.nums.length, tau: s.tau, digits: num.digits, inks: num.idx.map((i) => s.test.x[i]), reads, decision: G.decide(reads, s.tau) });
      return;
    }
    self.postMessage({ id: q.id, ok: false, why: 'unknown request' });
  } catch (e) { self.postMessage({ id: q.id, ok: false, why: String((e && e.message) || e).slice(0, 200) }); }
};
