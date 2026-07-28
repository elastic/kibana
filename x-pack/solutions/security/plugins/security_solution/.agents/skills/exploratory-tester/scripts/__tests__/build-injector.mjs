/**
 * Generates scripts/inject-detectors.js from the three canonical detector scripts.
 *
 * Run this whenever you edit check-dom-anomalies.js, classify-console.js, or dedup-network.js:
 *
 *   node x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/__tests__/build-injector.mjs
 *
 * Then re-run equivalence.test.mjs to verify the update is correct.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = resolve(__dirname, '..');
const OUTPUT_PATH = join(SCRIPTS_DIR, 'inject-detectors.js');

// ── Load canonical scripts ─────────────────────────────────────────────────

const domScript     = readFileSync(join(SCRIPTS_DIR, 'check-dom-anomalies.js'), 'utf8').trim();
const consoleScript = readFileSync(join(SCRIPTS_DIR, 'classify-console.js'),   'utf8').trim();
const networkScript = readFileSync(join(SCRIPTS_DIR, 'dedup-network.js'),       'utf8').trim();

// ── Extract inner functions from IIFEs ─────────────────────────────────────
//
// classify-console.js: ((messages) => { body })(/*MESSAGES*/)
//   → extract: (messages) => { body }
// dedup-network.js: ((requests) => { body })(/*REQUESTS*/)
//   → extract: (requests) => { body }

function extractInner(script, iifeMark, placeholder) {
  const iffeStart = script.indexOf(iifeMark);
  const markerIdx = script.lastIndexOf(`)(${placeholder})`);
  if (iffeStart === -1 || markerIdx === -1) {
    throw new Error(`Could not find IIFE pattern '${iifeMark}' or placeholder '${placeholder}'`);
  }
  return script.slice(iffeStart + 1, markerIdx);
}

const consoleFn = extractInner(consoleScript, '((messages)', '/*MESSAGES*/');
const networkFn = extractInner(networkScript, '((requests)', '/*REQUESTS*/');

// domScript is already a self-contained arrow function: () => { ... }

// ── Generate injector ──────────────────────────────────────────────────────

const injector = `/**
 * Detector injection wrapper for exploratory testing.
 *
 * GENERATED FILE — do not edit directly.
 * Source: check-dom-anomalies.js, classify-console.js, dedup-network.js
 * Regenerate: node scripts/__tests__/build-injector.mjs
 * Verify:     node scripts/__tests__/equivalence.test.mjs
 *
 * Usage: pass as the \`function\` argument to browser_evaluate ONCE at flow start,
 * and again after every browser_navigate (navigation resets the window context):
 *
 *   browser_evaluate(function: "<paste full file content>")
 *
 * Per-step detector calls are then:
 *   browser_evaluate(function: "() => window.__et.dom()")
 *   browser_evaluate(function: "() => window.__et.console(${JSON.stringify(['msg1', 'msg2'])})")
 *   browser_evaluate(function: "() => window.__et.network(${JSON.stringify([{method:'GET',url:'https://...'}])})")
 *
 * Fallback: if browser_evaluate fails or window.__et is undefined after injection,
 * fall back to the original paste procedure (paste full script content each time).
 *
 * Token savings vs paste: ~129 KB/flow → ~9 KB/flow (93% reduction in detector payload).
 */
(() => {
  window.__et = {

    // ── Detector A: DOM anomalies ─────────────────────────────────────────
    // source: scripts/check-dom-anomalies.js
    dom: ${domScript},

    // ── Detector B: console classifier ───────────────────────────────────
    // source: scripts/classify-console.js (inner function extracted from IIFE)
    console: ${consoleFn},

    // ── Detector C: network duplicate detector ────────────────────────────
    // source: scripts/dedup-network.js (inner function extracted from IIFE)
    network: ${networkFn},

  };
})()
`;

writeFileSync(OUTPUT_PATH, injector, 'utf8');
console.log(`Written: ${OUTPUT_PATH}`);
console.log(`  DOM fn length:     ${domScript.length} bytes`);
console.log(`  Console fn length: ${consoleFn.length} bytes`);
console.log(`  Network fn length: ${networkFn.length} bytes`);
console.log(`  Injector total:    ${injector.length} bytes`);
console.log(`\nPaste cost per flow: ${(domScript.length + consoleScript.length + networkScript.length) * 15} bytes (15 pastes)`);
console.log(`Inject cost per flow: ${injector.length} bytes (inject once) + ~3,600 bytes (60-byte calls × 15 steps + message/request data)`);
