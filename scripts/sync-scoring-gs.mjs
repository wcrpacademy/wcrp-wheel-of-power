// Writes apps-script/scoring.gs from js/scoring.js (the same code without `export `), so the browser and
// Apps Script always score the same way. Run after any change to js/scoring.js:  npm run gs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export function toGs(js) {
  const body = js.replace(/^export /gm, '');
  return `// GENERATED from js/scoring.js by \`npm run gs\`. Do not edit here: edit js/scoring.js and run it again.\n${body}`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const js = readFileSync(join(ROOT, 'js', 'scoring.js'), 'utf8');
  writeFileSync(join(ROOT, 'apps-script', 'scoring.gs'), toGs(js));
  console.log('apps-script/scoring.gs updated from js/scoring.js');
}
