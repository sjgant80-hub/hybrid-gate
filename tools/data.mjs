// tools/data.mjs — the MNIST files, decompressed and converted (Node side; the page uses DecompressionStream).
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import M from '../src/mnist.mjs';
const ROOT = new URL('../', import.meta.url);
const g = (f) => new Uint8Array(gunzipSync(readFileSync(new URL('data/mnist/' + f, ROOT))));
export const train = () => M.parse(g('train-images-idx3-ubyte.gz'), g('train-labels-idx1-ubyte.gz'));
export const test = () => M.parse(g('t10k-images-idx3-ubyte.gz'), g('t10k-labels-idx1-ubyte.gz'));
