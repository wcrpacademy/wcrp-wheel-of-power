// Prints the SHA-256 hash of an organiser PIN for the Apps Script's Script property ADMIN_PIN_HASH.
// The PIN and its hash never go in the repo or config.js (config.js is public). The PIN itself is never saved.
//   npm run pin
import { createHash } from 'node:crypto';
import { createInterface } from 'node:readline/promises';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const pin = (await rl.question('Organiser PIN (6+ digits or characters): ')).trim();
rl.close();
if (pin.length < 6) {
  console.error('Use at least 6 characters.');
  process.exit(1);
}
console.log(`\nADMIN_PIN_HASH = ${createHash('sha256').update(pin).digest('hex')}`);
console.log('Apps Script → Project Settings → Script properties → add ADMIN_PIN_HASH with that value.');
console.log('Keep the PIN itself somewhere safe (not in the repo or the vault).');
