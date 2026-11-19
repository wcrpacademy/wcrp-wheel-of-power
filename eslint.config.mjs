// ESLint (flat config). Browser modules in js/, Node tooling in tests/ and scripts/.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/', 'apps-script/'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js', 'config.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.browser } },
  },
  { files: ['config.js'], languageOptions: { sourceType: 'script' } },
  {
    files: ['tests/**/*.mjs', 'scripts/**/*.mjs', '*.mjs'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
  },
];
