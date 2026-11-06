/**
 * Generates scripts/inject-detectors.js from the three canonical detector scripts.
 *
 * Run this whenever you edit check-dom-anomalies.js, classify-console.js, or dedup-network.js:
 *
 *   node x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/__tests__/build-injector.mjs
 *
 * Then re-run equivalence.test.mjs to verify the update is correct. That test
 * also asserts the committed inject-detectors.js has zero drift from this
 * generator, so a forgotten regeneration after a detector edit fails CI-style
 * locally instead of shipping silently.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { buildInjectorSource } from './injector-builder.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = resolve(__dirname, '..');
const OUTPUT_PATH = join(SCRIPTS_DIR, 'inject-detectors.js');

const domScript     = readFileSync(join(SCRIPTS_DIR, 'check-dom-anomalies.js'), 'utf8').trim();
const consoleScript = readFileSync(join(SCRIPTS_DIR, 'classify-console.js'),   'utf8').trim();
const networkScript = readFileSync(join(SCRIPTS_DIR, 'dedup-network.js'),       'utf8').trim();

const injector = buildInjectorSource({ domScript, consoleScript, networkScript });

writeFileSync(OUTPUT_PATH, injector, 'utf8');
console.log(`Written: ${OUTPUT_PATH}`);
console.log(`  DOM source length:     ${domScript.length} bytes`);
console.log(`  Console source length: ${consoleScript.length} bytes`);
console.log(`  Network source length: ${networkScript.length} bytes`);
console.log(`  Injector total:        ${injector.length} bytes`);
console.log(`\nPaste cost per checklist step: ${domScript.length + consoleScript.length + networkScript.length} bytes (all three scripts pasted once per step).`);
console.log(`Inject cost: ${injector.length} bytes per injection (once per flow, and again after every browser_navigate) + a small per-step call for each detector.`);
