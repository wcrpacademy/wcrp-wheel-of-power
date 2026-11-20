// Writes the join QR code from config.js publicUrl into qr/ (Node 24, tooling only; same as the values card sort).
//
//   npm run qr   → qr/join.svg (live.html, the projector) + qr/join.png (slides and printed cards)
//
// The files are committed, so the site never makes a QR at runtime (no external requests).
// tests/qr.test.mjs fails if qr/join.svg no longer matches publicUrl: run `npm run qr` after changing it.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import QRCode from 'qrcode';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const QR_STYLE = { errorCorrectionLevel: 'M', margin: 2, color: { dark: '#232C3D', light: '#FFFFFF' } };

export function joinUrl() {
  const ctx = { window: {} };
  vm.runInNewContext(readFileSync(join(ROOT, 'config.js'), 'utf8'), ctx);
  const host = String(ctx.window.WHEEL_CONFIG.publicUrl || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!/^[\w.-]+(:\d+)?$/.test(host)) throw new Error('config.js publicUrl must be a host name, e.g. wheelpower.wcrp-academy.org');
  return `https://${host}/`;
}

export function joinSvg(url) {
  return QRCode.toString(url, { ...QR_STYLE, type: 'svg' });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const url = joinUrl();
  mkdirSync(join(ROOT, 'qr'), { recursive: true });
  writeFileSync(join(ROOT, 'qr', 'join.svg'), await joinSvg(url));
  await QRCode.toFile(join(ROOT, 'qr', 'join.png'), url, { ...QR_STYLE, width: 1200 });
  console.log(`qr/join.svg and qr/join.png → ${url}`);
}
