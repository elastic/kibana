/**
 * Standalone detector runner for exploratory-tester.
 *
 * Runs all three detectors against every fixture and prints results.
 * No test framework required. Run from anywhere inside the Kibana repo:
 *
 *   node x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/__tests__/run-detectors.mjs
 *
 * Requires: jsdom (available in Kibana root node_modules).
 *
 * Exit 0: all detectors ran without throwing.
 * Exit 1: a detector threw an unexpected error.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = resolve(__dirname, '..');
const FIXTURES_DIR = resolve(__dirname, 'fixtures');

// ── Load detector scripts ──────────────────────────────────────────────────

const domScript     = readFileSync(join(SCRIPTS_DIR, 'check-dom-anomalies.js'), 'utf8').trim();
const consoleScript = readFileSync(join(SCRIPTS_DIR, 'classify-console.js'),   'utf8').trim();
const networkScript = readFileSync(join(SCRIPTS_DIR, 'dedup-network.js'),       'utf8').trim();

// ── DOM detector ───────────────────────────────────────────────────────────
// Simulates: browser_evaluate(function: "<paste domScript>")
// The function runs in the page context where `document` is the live DOM.

function runDomDetector(html, mode = 'paste') {
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  if (mode === 'paste') {
    // Current behavior: full script pasted as browser_evaluate argument each time.
    dom.window.eval(`window.__result = (${domScript})()`);
  } else {
    // Inject mode (PR 2): script installed once on window.__et, then called per step.
    dom.window.eval(`window.__et = { dom: ${domScript} }`);
    dom.window.eval(`window.__result = window.__et.dom()`);
  }
  return dom.window.__result;
}

// ── Console detector ───────────────────────────────────────────────────────
// Simulates: browser_evaluate(function: consoleScript with /*MESSAGES*/ replaced)

function runConsoleDetector(messages, mode = 'paste') {
  const messagesJson = JSON.stringify(messages);
  if (mode === 'paste') {
    // Current behavior: full script with messages inlined at /*MESSAGES*/ placeholder.
    const pasted = consoleScript.replace('/*MESSAGES*/', messagesJson);
    return eval(pasted); // eslint-disable-line no-eval -- intentional: simulates browser_evaluate
  } else {
    // Inject mode: store inner function on window.__et, call with messages each step.
    // indexOf locates the IIFE start (after the JSDoc header); lastIndexOf finds the invocation end.
    const iffeStart = consoleScript.indexOf('((messages)');
    const markerIdx = consoleScript.lastIndexOf(')(/*MESSAGES*/)');
    const innerSrc = consoleScript.slice(iffeStart + 1, markerIdx);
    const innerFn = eval(`(${innerSrc})`); // eslint-disable-line no-eval
    return innerFn(messages);
  }
}

// ── Network detector ───────────────────────────────────────────────────────
// Simulates: browser_evaluate(function: networkScript with /*REQUESTS*/ replaced)

function runNetworkDetector(requests, mode = 'paste') {
  const requestsJson = JSON.stringify(requests);
  if (mode === 'paste') {
    // Current behavior: full script with requests inlined at /*REQUESTS*/ placeholder.
    const pasted = networkScript.replace('/*REQUESTS*/', requestsJson);
    return eval(pasted); // eslint-disable-line no-eval -- intentional: simulates browser_evaluate
  } else {
    // Inject mode: same extraction pattern as console — indexOf for IIFE start, lastIndexOf for end.
    const iffeStart = networkScript.indexOf('((requests)');
    const markerIdx = networkScript.lastIndexOf(')(/*REQUESTS*/)');
    const innerSrc = networkScript.slice(iffeStart + 1, markerIdx);
    const innerFn = eval(`(${innerSrc})`); // eslint-disable-line no-eval
    return innerFn(requests);
  }
}

// ── Run all fixtures ───────────────────────────────────────────────────────

let failures = 0;

function report(label, result) {
  const json = JSON.stringify(result, null, 2);
  const summary = [];
  if (result.level1?.length) summary.push(`L1:${result.level1.length}`);
  if (result.level2?.length) summary.push(`L2:${result.level2.length}`);
  if (result.level3?.length) summary.push(`L3:${result.level3.length}`);
  if (result.suppressed?.length) summary.push(`sup:${result.suppressed.length}`);
  if (result.findings?.length) summary.push(`dup:${result.findings.length}`);
  const tag = summary.length ? `[${summary.join(' ')}]` : '[clean]';
  console.log(`  ${tag} ${label}`);
}

console.log('\n── DOM detector (check-dom-anomalies.js) ───────────────────────────────');
const domFixtures = readdirSync(FIXTURES_DIR).filter(f => f.startsWith('dom-') && f.endsWith('.html'));
for (const file of domFixtures.sort()) {
  const html = readFileSync(join(FIXTURES_DIR, file), 'utf8');
  try {
    const result = runDomDetector(html, 'paste');
    report(file, result);
  } catch (e) {
    console.error(`  FAIL ${file}: ${e.message}`);
    failures++;
  }
}

console.log('\n── Console detector (classify-console.js) ──────────────────────────────');
const consoleFixtures = readdirSync(FIXTURES_DIR).filter(f => f.startsWith('console-') && f.endsWith('.json'));
for (const file of consoleFixtures.sort()) {
  const messages = JSON.parse(readFileSync(join(FIXTURES_DIR, file), 'utf8'));
  try {
    const result = runConsoleDetector(messages, 'paste');
    report(file, result);
  } catch (e) {
    console.error(`  FAIL ${file}: ${e.message}`);
    failures++;
  }
}

console.log('\n── Network detector (dedup-network.js) ─────────────────────────────────');
const networkFixtures = readdirSync(FIXTURES_DIR).filter(f => f.startsWith('network-') && f.endsWith('.json'));
for (const file of networkFixtures.sort()) {
  const requests = JSON.parse(readFileSync(join(FIXTURES_DIR, file), 'utf8'));
  try {
    const result = runNetworkDetector(requests, 'paste');
    report(file, result);
  } catch (e) {
    console.error(`  FAIL ${file}: ${e.message}`);
    failures++;
  }
}

if (failures > 0) {
  console.error(`\n${failures} fixture(s) failed — detectors threw unexpected errors.\n`);
  process.exit(1);
} else {
  console.log('\nAll fixtures ran without errors.\n');
  process.exit(0);
}
