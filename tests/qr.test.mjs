// The committed join QR must match config.js publicUrl (run `npm run qr` after changing it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { joinUrl, joinSvg } from '../scripts/make-qr.mjs';

test('qr/join.svg encodes config.js publicUrl', async () => {
  const url = joinUrl();
  assert.match(url, /^https:\/\/[\w.-]+\/$/);
  const committed = readFileSync(new URL('../qr/join.svg', import.meta.url), 'utf8');
  assert.equal(committed, await joinSvg(url), `qr/join.svg is out of date for ${url}: run npm run qr`);
});
