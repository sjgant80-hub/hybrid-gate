// app.mjs — the page's glue. Every number is read from the committed record, the tuning table or the gate receipts, or
// computed in this tab (claim H8: none is typed into index.html). The reader runs in worker.mjs.
import { mintCase, sourcesOf } from './vendor/liveware/mintcase.mjs';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) if (k === 'class') e.className = v; else e.setAttribute(k, v); for (const c of kids) e.append(c); return e; };
const json = (p) => fetch(p).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const pct = (x) => (x * 100).toFixed(1) + '%';
const pts = (x) => (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x * 100).toFixed(2) + ' points';
const big = (n) => Number(n).toLocaleString('en-GB');
const chip = (pass) => el('span', { class: 'chip ' + (pass ? 'win' : 'bad') }, pass ? 'HELD' : 'FAILED');
let REC = null, TUNE = null, GATES = [], BASIS = null;

const PLAIN = { H2: 'The gate is inspectable: every decision has a reason that matches it', H3: 'Precision: accepted numbers exactly right', H4: 'It beats reading alone: fewer wrong numbers let through',
  H5: 'The step-code earns its keep: repair adds coverage, and repairs are right', H6: 'Coverage: share of numbers accepted' };
const WHY = { ok: 'the check holds and every digit is confident: accepted', repaired: 'the check failed; the least confident digit was solved to the cell\'s runner-up: accepted', 'no-fit': 'some digit fits nothing the cell knows: referred',
  'low-confidence': 'the check holds but a digit is unsure: referred', 'check-failed': 'the check failed and could not be repaired safely: referred' };
function shown(v) {
  const m = v.measured;
  if (v.id === 'H2') return [m ? 'every decision consistent' : 'an inconsistency', 'consistent'];
  if (v.id === 'H3') return [pct(m) + ' of accepted', '≥ 99.0%'];
  if (v.id === 'H4') return [pts(m) + ' (lower bound)', '> 0'];
  if (v.id === 'H5') return [pts(m[0]) + ' coverage (lower bound); ' + pct(m[1]) + ' of repairs right', '> 0, and ≥ 95%'];
  return [pct(m) + ' of numbers', '≥ 40%'];
}
function fill() {
  const r = REC.record, v = REC.verdicts, held = v.filter((x) => x.pass), failed = v.filter((x) => !x.pass);
  $('verdictline').textContent = held.length + ' of ' + v.length + ' measured claims held on ' + big(r.numbers) + ' held-out numbers' + (failed.length ? '. Failed and kept: ' + failed.map((x) => x.id + ' (' + PLAIN[x.id].charAt(0).toLowerCase() + PLAIN[x.id].slice(1) + ')').join('; ') + '.' : '.') +
    ' The hybrid accepted ' + pct(r.accepted / r.numbers) + ' of them, ' + pct(r.right / Math.max(1, r.accepted)) + ' exactly right; reading alone got ' + pct(r.settleOnlyRight / r.numbers) + ' fully right.';
  const tb = $('claims').querySelector('tbody'); tb.replaceChildren();
  tb.append(el('tr', {}, el('td', {}, el('b', {}, 'H1')), el('td', {}, 'The step-code is exact on every five-digit string and position'), el('td', {}, 'checked exhaustively by test/hybrid.test.mjs'), el('td', {}, 'all exact'), el('td', {}, el('span', { class: 'chip win' }, 'CI'))));
  for (const x of v) { const [m, bar] = shown(x); tb.append(el('tr', {}, el('td', {}, el('b', {}, x.id)), el('td', {}, PLAIN[x.id]), el('td', {}, m), el('td', { class: 'num' }, bar), el('td', {}, chip(x.pass)))); }
  for (const [id, w, m] of [['H7', 'Deterministic: one hash for the held-out record, in CI and in your tab', r.hash.slice(0, 16) + '…'], ['H8', 'No measured number typed into this page', 'checked by test/page.test.mjs'], ['H9', 'The MNIST files and the vendored Rung 1 kernel are the pinned bytes', 'checked by test/page.test.mjs']])
    tb.append(el('tr', {}, el('td', {}, el('b', {}, id)), el('td', {}, w), el('td', {}, m), el('td', {}, '—'), el('td', {}, el('span', { class: 'chip win' }, 'CI'))));
  for (const g of GATES) tb.append(el('tr', {}, el('td', {}, el('b', {}, 'G')), el('td', {}, 'Mutation gate on ' + g.kernel), el('td', { class: 'num' }, g.killed + ' of ' + g.total + ' caught, ' + g.ignored + ' baselined'), el('td', {}, 'clean'), el('td', {}, chip(g.clean && g.ignored === 0))));
  const ways = [['Reading alone (accepts everything)', r.numbers, r.settleOnlyRight], ['The check, no repair', r.acceptedNoRepair, r.right - r.repairedRight], ['The sealed hybrid gate (τ = ' + r.tau + ')', r.accepted, r.right], ['The margin gate: exploratory, not a claim (τ = ' + r.explore.tau + ')', r.explore.accepted, r.explore.right]];
  $('ways').querySelector('tbody').replaceChildren(...ways.map(([a, acc, right]) => el('tr', {}, el('td', {}, a), el('td', { class: 'num' }, big(acc) + ' (' + pct(acc / r.numbers) + ')'), el('td', { class: 'num' }, acc ? pct(right / acc) : '—'), el('td', { class: 'num' }, big(acc - right)))));
  $('reasons').querySelector('tbody').replaceChildren(...Object.entries(r.reasons).map(([k, n]) => el('tr', {}, el('td', {}, el('code', {}, k)), el('td', { class: 'num' }, big(n)), el('td', {}, WHY[k]))));
  const vf = (id) => v.find((x) => x.id === id) || {};
  $('lesson').textContent = 'The exact check does its job: reading alone lets through ' + big(r.numbers - r.settleOnlyRight) + ' wrong numbers, and the hybrid lets through ' + big(r.accepted - r.right) + ' (H4 ' + (vf('H4').pass ? 'held' : 'FAILED') + '). ' +
    'But precision is ' + pct(r.right / Math.max(1, r.accepted)) + ', short of the sealed 99% (H3 ' + (vf('H3').pass ? 'held' : 'FAILED') + '), and repairs are right only ' + pct(r.repaired ? r.repairedRight / r.repaired : 0) + ' of the time. The limit is the digit reader: when one digit is misread another often is too, and two wrong digits can cancel in the check. ' +
    'The margin gate shown beside, which judges confidence before settling, accepts fewer numbers with fewer mistakes (' + pct(r.explore.right / Math.max(1, r.explore.accepted)) + ' right), which is tuning\'s finding: settling erases the uncertainty the gate needs. It is exploratory, not a sealed claim.';
  const ul = $('results'); ul.replaceChildren();
  const li = (t) => ul.append(el('li', {}, t));
  li(big(r.numbers) + ' held-out numbers from ' + big(r.digits) + ' test digits. Reading alone gets ' + pct(r.settleOnlyRight / r.numbers) + ' of them fully right and accepts all.');
  li('The hybrid accepts ' + big(r.accepted) + ' (' + pct(r.accepted / r.numbers) + ', H6 ' + (vf('H6').pass ? 'held' : 'FAILED') + '), of which ' + pct(r.right / Math.max(1, r.accepted)) + ' are exactly right (H3 ' + (vf('H3').pass ? 'held' : 'FAILED') + ').');
  li('Repairs: ' + big(r.repaired) + ', of which ' + big(r.repairedRight) + ' right (H5 ' + (vf('H5').pass ? 'held' : 'FAILED') + '). Without repair the check accepts ' + big(r.acceptedNoRepair) + '.');
  li('Wrong numbers let through: ' + big(r.numbers - r.settleOnlyRight) + ' by reading alone, ' + big(r.accepted - r.right) + ' by the hybrid; lower bound of the difference per number ' + pts(r.lows.H4) + ' (H4 ' + (vf('H4').pass ? 'held' : 'FAILED') + ').');
  for (const g of GATES) li('Mutation gate on ' + g.kernel + ': ' + g.killed + ' of ' + g.total + ' caught, ' + g.ignored + ' baselined.');
  $('faq-share').textContent = 'On these held-out numbers the hybrid accepted ' + pct(r.accepted / r.numbers) + ' and referred the rest with reasons. On your numbers it depends on how clean your digits are; that is what a sealed test on your own data would measure.';
  $('faq-wrong').textContent = 'Yes, and it is measured: ' + big(r.accepted - r.right) + ' of the ' + big(r.accepted) + ' numbers it accepted here were wrong, against ' + big(r.numbers - r.settleOnlyRight) + ' wrong numbers if every read were accepted. A single misread digit can never pass the check; two can, rarely.';
  $('faq-failed').textContent = failed.length ? failed.map((x) => x.id + ': ' + PLAIN[x.id] + ', measured ' + shown(x)[0] + '.').join(' ') + ' Each failure is kept on the record and on this page.' : 'Nothing measured failed its bar on this run.';
  const best = TUNE.table.reduce((a, t) => (t.right * a.acc > a.right * t.acc ? t : a), TUNE.table[0]);
  $('tunenote').textContent = 'On ' + big(TUNE.tuneNumbers) + ' tune numbers, no τ in the sealed grid reached 99.5% precision; the best was τ = ' + best.tau + ' at ' + pct(best.right / best.acc) + '. The settled fit share separates right from wrong digits only weakly; the margin before settling does better, so a margin gate was tried as an exploration: its best tune τ was ' + TUNE.explore.tau + '.';
  const gl = (k) => { const g = GATES.find((x) => x.kernel === k); return g ? 'mutation gate ' + g.killed + '/' + g.total + ', ' + g.ignored + ' baselined' : 'tested in CI'; };
  $('parts').replaceChildren(...[['src/gate.mjs', 'The reader and the gate: each digit\'s read and confidence, and the decision with its reason.'], ['src/luhn.mjs', 'The exact part: the Luhn check and the one-digit solve, exhaustively tested.'], ['src/numbers.mjs', 'Assembling numbers from isolated digits, exactly as sealed.'],
    ['src/mnist.mjs', 'MNIST as the cell\'s 8×8 ink grid, the way the optical digits were made.'], ['src/run.mjs', 'Tuning τ and the held-out evaluation, with every claim against its bar.'], ['src/explore.mjs', 'The exploratory margin gate: not a claim.']]
    .map(([h, t]) => el('div', { class: 'card' }, el('div', { class: 'k' }, h), el('p', { style: 'font-size:14.5px;margin-top:4px' }, t), el('p', { class: 'vs', style: 'margin-top:6px;color:var(--accent)' }, gl(h)))));
  $('timeline').replaceChildren(...[['Seal 1', 'CLAIMS.md: the task, the step-code, the gate, the τ rule, every bar.'], ['Tuning', 'The cell grown and τ sought on training digits only: no τ reached the target.'], ['Amendment 1', 'The gap in the τ rule filled, before the test digits were read (AMENDMENT.md).'],
    ['Seal 2', 'The cell and both τ values frozen by hash (SEAL2.md).'], ['The held-out, once', 'The test digits read once (data/record.json).']].map(([a, b]) => el('li', {}, el('b', {}, a), ' · ', b)));
}

let worker = null, seq = 0;
function ask(msg) { if (!worker) worker = new Worker(new URL('./worker.mjs', import.meta.url), { type: 'module' }); return new Promise((resolve) => { const id = ++seq; const on = (e) => { if (e.data.id === id) { worker.removeEventListener('message', on); resolve(e.data); } }; worker.addEventListener('message', on); worker.postMessage({ ...msg, id }); }); }
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function mix(a, b, t) { const h = (s) => { const x = s.replace('#', ''); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)); }; const [p, q] = [h(a), h(b)]; return 'rgb(' + p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(',') + ')'; }
function draw(canvas, ink) { const g = canvas.getContext('2d'), c0 = css('--px0') || '#ffffff', c1 = css('--px1') || '#1d1c1a'; for (let p = 0; p !== 64; p++) { g.fillStyle = mix(c0, c1, ink[p] / 16); g.fillRect(p % 8, Math.floor(p / 8), 1, 1); } }
let J = 0;
async function showNumber() {
  $('numread').textContent = 'reading…';
  const r = await ask({ do: 'number', j: J });
  if (!r.ok) { $('numread').textContent = 'it did not load: ' + r.why; return; }
  $('digits').replaceChildren(...r.inks.map((ink, k) => { const c = el('canvas', { width: '8', height: '8', 'aria-label': 'handwritten ' + r.digits[k] }); draw(c, ink); return el('figure', {}, c, el('figcaption', {}, k === 4 ? 'check digit' : 'digit ' + (k + 1))); }));
  $('numtable').querySelector('tbody').replaceChildren(...r.reads.map((d, k) => el('tr', {}, el('td', {}, String(k + 1)), el('td', { class: 'num' }, String(r.digits[k])), el('td', { class: 'num ' + (d.answer === r.digits[k] ? 'ok' : 'no') }, d.answer < 0 ? 'none' : String(d.answer)), el('td', { class: 'num' }, String(d.second)),
    el('td', { class: 'num' }, d.total ? Math.floor((100 * d.top) / d.total) + '% of the fit' : 'no fit'))));
  const dcs = r.decision, truth = r.digits.join(''), out = dcs.number.join('');
  $('numread').textContent = 'Number ' + big(r.j + 1) + ' of ' + big(r.count) + ': written ' + truth + '. The gate ' + (dcs.verdict === 'accept' ? 'accepted ' + out + (out === truth ? ' ✓ right' : ' ✗ wrong') : 'referred it to a person') + ', reason: ' + dcs.reason + ' (' + WHY[dcs.reason] + ').';
}
$('another').onclick = () => { J = Math.floor(Math.random() * 100000); showNumber(); };
$('go').onclick = async () => {
  $('go').disabled = true; $('gostatus').textContent = 'decompressing the test digits, rebuilding every number, reading and deciding each…';
  const r = await ask({ do: 'rerun' });
  $('go').disabled = false;
  if (!r.ok) { $('gostatus').textContent = 'it did not run: ' + r.why; return; }
  const a = r.record, b = REC.record;
  const rows = [['numbers', a.numbers, b.numbers], ['accepted', a.accepted, b.accepted], ['exactly right', a.right, b.right], ['repaired', a.repaired, b.repaired], ['the hash of the record', a.hash, b.hash]];
  const tb = $('proof').querySelector('tbody'); tb.replaceChildren();
  let all = true;
  for (const [w, x, y] of rows) { const same = x === y; all = all && same; tb.append(el('tr', {}, el('td', {}, w), el('td', { class: 'num' }, String(x).slice(0, 24)), el('td', { class: 'num' }, String(y).slice(0, 24)), el('td', { class: same ? 'ok' : 'no' }, same ? '✓ same' : '✗ differs'))); }
  $('proof').hidden = false;
  $('gostatus').textContent = (all ? '✓ your tab reproduced the record, hash and all' : '✗ your tab differs from the record') + ' · ' + big(a.numbers) + ' numbers in ' + (r.ms / 1000).toFixed(1) + ' s';
};

const gbp = (x) => '£' + Math.round(x).toLocaleString('en-GB');
function renderCost() {
  if (!BASIS) { $('c-head').textContent = 'The sourced basis did not load; reload the page.'; return; }
  const v = (id) => Number($(id).value);
  const r = mintCase(BASIS, { hoursPerWeek: v('c-hours'), share: v('c-share') / 100, seats: v('c-seats'), casesPerWeek: v('c-cases'), years: v('c-years') });
  if (!r.ok) { $('c-head').textContent = 'Check the inputs: ' + r.why + '.'; return; }
  const yrs = r.inputs.years + (r.inputs.years === 1 ? ' year' : ' years');
  $('c-overh').textContent = 'Over ' + yrs;
  $('c-head').textContent = `This process costs you ${gbp(r.perYear.today)} a year in staff time today. Owning it: ${gbp(r.perYear.own)} a year, which is ${gbp(r.savingPerYear)} a year back and ${gbp(r.savingOver)} over ${yrs}.`;
  const rows = [['Today', 'Your team does all of it.', 'today'], ['Rent AI assistant seats', `Microsoft 365 Copilot for ${r.inputs.seats} people (${gbp(r.lines.seats)} a year). It helps each person; the work, and the staff time, stay.`, 'rentSeats'],
    ['Call a cloud AI on every case', `Takes the same share off, billed per case at Claude Sonnet 5 API rates (${gbp(r.lines.api)} a year at your volume), and every case leaves your building.`, 'cloudApi'],
    ['Own it', `Takes the same share off on a machine you already have, for about ${gbp(r.lines.power)} a year of electricity. No seats, no meter, nothing leaves.`, 'own']];
  const tb = $('c-table').querySelector('tbody'); tb.replaceChildren();
  for (const [a, b, k] of rows) tb.append(el('tr', {}, el('td', {}, el('b', {}, a)), el('td', {}, b), el('td', { class: 'num' }, gbp(r.perYear[k])), el('td', { class: 'num' }, gbp(r.over[k]))));
  $('c-note').textContent = `Owning beats the cloud route by ${gbp(r.versusCloudOver)} over ${yrs} at this volume. Staff time is a floor: the UK median wage, with on-costs left out.`;
  $('c-board').textContent = `A small owned reader took the clear cases and referred the rest with reasons, and every failure is published. Pick one keying job your people do by hand. Today it costs ${gbp(r.perYear.today)} a year in staff time. If an owned reader takes off the share you estimate, that is ${gbp(r.savingPerYear)} a year back, on hardware you already have, with nothing leaving the building, and the fee is due only on a receipt that it beat your current way on your own data.`;
}

async function main() {
  [REC, TUNE, BASIS] = await Promise.all(['data/record.json', 'data/tune.json', 'vendor/liveware/basis.json'].map(json));
  GATES = (await Promise.all(['gate', 'luhn', 'numbers', 'mnist', 'run', 'explore'].map((k) => json('receipts/gate-' + k + '.json')))).filter(Boolean);
  $('c-src').replaceChildren(...sourcesOf(BASIS || {}).map((s) => { const li = el('li', {}, s.what + (s.source ? ': ' : '')); if (s.source) { const a = el('a', { href: s.source, target: '_blank', rel: 'noopener' }); try { a.textContent = new URL(s.source).hostname; } catch { a.textContent = s.source; } li.append(a); } return li; }));
  for (const id of ['c-hours', 'c-share', 'c-seats', 'c-cases', 'c-years']) $(id).addEventListener('input', renderCost);
  renderCost();
  const src = await fetch('src/gate.mjs').then((r) => (r.ok ? r.text() : '')).catch(() => '');
  $('gatesrc').textContent = src ? src.slice(src.indexOf('// ── THE GATE ──'), src.indexOf('// ── END OF THE GATE ──') + 23) : 'src/gate.mjs did not load.';
  if (!REC || !TUNE) { $('verdictline').textContent = 'The record did not load; reload the page.'; return; }
  fill();
  showNumber();
}
main();
