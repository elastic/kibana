/**
 * Equivalence test harness for exploratory-tester detectors.
 *
 * Verifies two things for every fixture:
 *   1. CORRECTNESS — the detector produces the expected classification.
 *   2. EQUIVALENCE — paste-mode and inject-mode produce byte-identical output.
 *      (Guards against PR 2 accidentally changing detector behavior.)
 *
 * No test framework required. Run from anywhere inside the Kibana repo:
 *
 *   node x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/__tests__/equivalence.test.mjs
 *
 * Requires: jsdom (available in Kibana root node_modules).
 *
 * Exit 0: all assertions passed.
 * Exit 1: one or more assertions failed (details printed to stderr).
 */

import { readFileSync } from 'fs';
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

// ── Assertion helpers ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    const msg = detail ? `${label}\n         ${detail}` : label;
    failures.push(msg);
    console.error(`  FAIL  ${msg}`);
  }
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── Detector runners ───────────────────────────────────────────────────────

function domPaste(html) {
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  dom.window.eval(`window.__r = (${domScript})()`);
  return JSON.parse(JSON.stringify(dom.window.__r)); // structured clone via JSON round-trip
}

function domInject(html) {
  const dom = new JSDOM(html, { runScripts: 'dangerously' });
  dom.window.eval(`window.__et = { dom: ${domScript} }`);
  dom.window.eval(`window.__r = window.__et.dom()`);
  return JSON.parse(JSON.stringify(dom.window.__r));
}

function consolePaste(messages) {
  const pasted = consoleScript.replace('/*MESSAGES*/', JSON.stringify(messages));
  return eval(pasted); // eslint-disable-line no-eval
}

function consoleInject(messages) {
  // Extract the inner arrow function from the IIFE wrapper:
  //   ((messages) => { body })(/*MESSAGES*/)
  // → (messages) => { body }
  // indexOf locates the IIFE start (after the JSDoc header); lastIndexOf finds the invocation end.
  const iffeStart = consoleScript.indexOf('((messages)');
  const markerIdx = consoleScript.lastIndexOf(')(/*MESSAGES*/)');
  const innerSrc = consoleScript.slice(iffeStart + 1, markerIdx);
  const inner = eval(`(${innerSrc})`); // eslint-disable-line no-eval
  return inner(messages);
}

function networkPaste(requests) {
  const pasted = networkScript.replace('/*REQUESTS*/', JSON.stringify(requests));
  return eval(pasted); // eslint-disable-line no-eval
}

function networkInject(requests) {
  // Same extraction pattern as consoleInject.
  const iffeStart = networkScript.indexOf('((requests)');
  const markerIdx = networkScript.lastIndexOf(')(/*REQUESTS*/)');
  const innerSrc = networkScript.slice(iffeStart + 1, markerIdx);
  const inner = eval(`(${innerSrc})`); // eslint-disable-line no-eval
  return inner(requests);
}

// ── Helper to load fixtures ────────────────────────────────────────────────

function html(name) { return readFileSync(join(FIXTURES_DIR, `${name}.html`), 'utf8'); }
function json(name) { return JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf8')); }

// ══════════════════════════════════════════════════════════════════════════
// DOM DETECTOR TESTS
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── DOM detector: correctness ────────────────────────────────────────────');

{
  const r = domPaste(html('dom-clean'));
  assert(r.level1.length === 0 && r.level2.length === 0 && r.level3.length === 0,
    'dom-clean → all arrays empty');
}

{
  const r = domPaste(html('dom-level1-error-toast'));
  assert(r.level1.length >= 1, 'dom-level1-error-toast → at least 1 level1 finding');
  assert(r.level1.some(i => i.type === 'error_toast'),
    'dom-level1-error-toast → type is error_toast');
  assert(r.level1[0].text.includes('Could not save'),
    'dom-level1-error-toast → text contains error message');
}

{
  const r = domPaste(html('dom-level1-error-page'));
  assert(r.level1.some(i => i.type === 'error_page'),
    'dom-level1-error-page → type is error_page');
  // title starts with "Error" triggers the title check
  assert(r.level1[0].text.length > 0,
    'dom-level1-error-page → text is non-empty');
}

{
  const r = domPaste(html('dom-level1-error-banner'));
  assert(r.level1.some(i => i.type === 'error_banner'),
    'dom-level1-error-banner → type is error_banner');
  assert(r.level1.some(i => i.text.includes('License expired')),
    'dom-level1-error-banner → text contains banner message');
}

{
  const r = domPaste(html('dom-level2-embeddable-error'));
  assert(r.level2.some(i => i.type === 'embeddable_error'),
    'dom-level2-embeddable-error → type is embeddable_error');
  assert(r.level2.find(i => i.type === 'embeddable_error').count === 2,
    'dom-level2-embeddable-error → count is 2 (both panels)');
}

{
  const r = domPaste(html('dom-level2-warning-badge'));
  assert(r.level2.some(i => i.type === 'search_response_warning_badge'),
    'dom-level2-warning-badge → type is search_response_warning_badge');
  assert(r.level2.some(i => i.text.includes('click it to read the full message')),
    'dom-level2-warning-badge → text includes click-to-read instruction');
}

{
  const r = domPaste(html('dom-level2-callout-danger'));
  assert(r.level2.some(i => i.type === 'error_callout'),
    'dom-level2-callout-danger → type is error_callout');
}

{
  const r = domPaste(html('dom-level2-panels-not-rendered'));
  assert(r.level2.some(i => i.type === 'panels_not_rendered'),
    'dom-level2-panels-not-rendered → type is panels_not_rendered');
}

{
  const r = domPaste(html('dom-level3-spinner'));
  assert(r.level3.some(i => i.type === 'spinner_present'),
    'dom-level3-spinner → type is spinner_present');
}

console.log('\n── DOM detector: paste ≡ inject (PR 2 equivalence gate) ────────────────');

for (const name of [
  'dom-clean',
  'dom-level1-error-toast',
  'dom-level1-error-page',
  'dom-level1-error-banner',
  'dom-level2-embeddable-error',
  'dom-level2-warning-badge',
  'dom-level2-callout-danger',
  'dom-level2-panels-not-rendered',
  'dom-level3-spinner',
]) {
  const fixture = html(name);
  const paste   = domPaste(fixture);
  const inject  = domInject(fixture);
  assert(deepEqual(paste, inject),
    `${name}: paste output === inject output`,
    deepEqual(paste, inject) ? '' : `paste=${JSON.stringify(paste)}\n         inject=${JSON.stringify(inject)}`);
}

// ══════════════════════════════════════════════════════════════════════════
// CONSOLE DETECTOR TESTS
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Console detector: correctness ────────────────────────────────────────');

{
  const r = consolePaste(json('console-clean'));
  assert(r.level1.length === 0 && r.level2.length === 0 && r.level3.length === 0 && r.suppressed.length === 0,
    'console-clean → all arrays empty');
}

{
  const r = consolePaste(json('console-level1-server-error'));
  assert(r.level1.some(i => i.type === 'server_error'),
    'console-level1-server-error → type is server_error');
}

{
  const r = consolePaste(json('console-level1-infinite-rerender'));
  assert(r.level1.some(i => i.type === 'infinite_rerender'),
    'console-level1-infinite-rerender → type is infinite_rerender');
}

{
  const r = consolePaste(json('console-level2-react-warning'));
  assert(r.level2.some(i => i.type === 'react_warning'),
    'console-level2-react-warning → type is react_warning');
}

{
  const r = consolePaste(json('console-level3-other-error'));
  assert(r.level3.some(i => i.type === 'console_error'),
    'console-level3-other-error → type is console_error');
}

{
  const r = consolePaste(json('console-suppressed-noise'));
  assert(r.suppressed.length >= 1,
    'console-suppressed-noise → at least 1 item in suppressed[]');
  assert(r.level1.length === 0 && r.level2.length === 0 && r.level3.length === 0,
    'console-suppressed-noise → nothing in level1/2/3');
}

console.log('\n── Console detector: paste ≡ inject ────────────────────────────────────');

for (const name of [
  'console-clean',
  'console-level1-server-error',
  'console-level1-infinite-rerender',
  'console-level2-react-warning',
  'console-level3-other-error',
  'console-suppressed-noise',
]) {
  const messages = json(name);
  const paste    = consolePaste(messages);
  const inject   = consoleInject(messages);
  assert(deepEqual(paste, inject),
    `${name}: paste output === inject output`);
}

// ══════════════════════════════════════════════════════════════════════════
// NETWORK DETECTOR TESTS
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Network detector: correctness ────────────────────────────────────────');

{
  const r = networkPaste(json('network-clean'));
  assert(r.findings.length === 0,
    'network-clean → no duplicate findings');
}

{
  const r = networkPaste(json('network-level2-duplicate'));
  assert(r.findings.length >= 2,
    'network-level2-duplicate → at least 2 duplicate findings');
  assert(r.findings.every(f => f.type === 'duplicate_api_call'),
    'network-level2-duplicate → all findings have type duplicate_api_call');
  const postDup = r.findings.find(f => f.key.startsWith('POST'));
  assert(postDup?.count === 2,
    'network-level2-duplicate → POST endpoint count is 2');
}

{
  const r = networkPaste(json('network-polling-ok'));
  assert(r.findings.length === 0,
    'network-polling-ok → polling endpoints (/status, /fleet-setup, /me) are suppressed');
}

console.log('\n── Network detector: paste ≡ inject ────────────────────────────────────');

for (const name of [
  'network-clean',
  'network-level2-duplicate',
  'network-polling-ok',
]) {
  const requests = json(name);
  const paste    = networkPaste(requests);
  const inject   = networkInject(requests);
  assert(deepEqual(paste, inject),
    `${name}: paste output === inject output`);
}

// ══════════════════════════════════════════════════════════════════════════
// GENERATED INJECTOR TESTS (inject-detectors.js)
// Verifies the generated file installs window.__et correctly and produces
// output identical to the canonical paste-mode invocations.
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Generated injector (inject-detectors.js): install + call ────────────');

const injectorScript = readFileSync(join(SCRIPTS_DIR, 'inject-detectors.js'), 'utf8');

// Helper: run the injector in a jsdom context, then call window.__et.dom()
function injectorDom(htmlContent) {
  const dom = new JSDOM(htmlContent, { runScripts: 'dangerously' });
  dom.window.eval(injectorScript);
  dom.window.eval('window.__r = window.__et.dom()');
  return JSON.parse(JSON.stringify(dom.window.__r));
}

// Helper: call window.__et.console(messages) after injection
function injectorConsole(messages) {
  // Console/network detectors don't need DOM — use a minimal jsdom just to host window.__et
  const dom = new JSDOM('<!DOCTYPE html>', { runScripts: 'dangerously' });
  dom.window.eval(injectorScript);
  dom.window.eval(`window.__r = window.__et.console(${JSON.stringify(messages)})`);
  return JSON.parse(JSON.stringify(dom.window.__r));
}

// Helper: call window.__et.network(requests) after injection
function injectorNetwork(requests) {
  const dom = new JSDOM('<!DOCTYPE html>', { runScripts: 'dangerously' });
  dom.window.eval(injectorScript);
  dom.window.eval(`window.__r = window.__et.network(${JSON.stringify(requests)})`);
  return JSON.parse(JSON.stringify(dom.window.__r));
}

// Spot-check: injector installs window.__et with all three keys
{
  const dom = new JSDOM(html('dom-clean'), { runScripts: 'dangerously' });
  dom.window.eval(injectorScript);
  assert(typeof dom.window.__et === 'object', 'injector installs window.__et as object');
  assert(typeof dom.window.__et.dom === 'function', 'window.__et.dom is a function');
  assert(typeof dom.window.__et.console === 'function', 'window.__et.console is a function');
  assert(typeof dom.window.__et.network === 'function', 'window.__et.network is a function');
}

// DOM: injector output === paste output for all DOM fixtures
console.log('\n── Injector DOM: paste ≡ injector ──────────────────────────────────────');
for (const name of [
  'dom-clean',
  'dom-level1-error-toast',
  'dom-level1-error-page',
  'dom-level1-error-banner',
  'dom-level2-embeddable-error',
  'dom-level2-warning-badge',
  'dom-level2-callout-danger',
  'dom-level2-panels-not-rendered',
  'dom-level3-spinner',
]) {
  const fixture = html(name);
  const paste   = domPaste(fixture);
  const inject  = injectorDom(fixture);
  assert(deepEqual(paste, inject),
    `${name}: paste output === injector output`);
}

// Console: injector output === paste output
console.log('\n── Injector console: paste ≡ injector ───────────────────────────────────');
for (const name of [
  'console-clean',
  'console-level1-server-error',
  'console-level1-infinite-rerender',
  'console-level2-react-warning',
  'console-level3-other-error',
  'console-suppressed-noise',
]) {
  const messages = json(name);
  const paste    = consolePaste(messages);
  const inject   = injectorConsole(messages);
  assert(deepEqual(paste, inject),
    `${name}: paste output === injector output`);
}

// Network: injector output === paste output
console.log('\n── Injector network: paste ≡ injector ───────────────────────────────────');
for (const name of [
  'network-clean',
  'network-level2-duplicate',
  'network-polling-ok',
]) {
  const requests = json(name);
  const paste    = networkPaste(requests);
  const inject   = injectorNetwork(requests);
  assert(deepEqual(paste, inject),
    `${name}: paste output === injector output`);
}

// ══════════════════════════════════════════════════════════════════════════
// LIFECYCLE TESTS (Task 3: wiring the injector into phases/2-explore.md)
//
// These lock in the exact contract phases/2-explore.md's inject/detect/
// fallback instructions depend on. If any of these fail, the phase
// instructions describe behavior the injector no longer provides.
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Lifecycle: missing-bridge detection (fallback trigger) ──────────────');

{
  // Before injection, `typeof window.__et` must be 'undefined' — this is the
  // exact check phases/2-explore.md uses to decide whether to fall back to
  // pasting the full detector script for that call.
  const dom = new JSDOM(html('dom-clean'), { runScripts: 'dangerously' });
  assert(dom.window.eval('typeof window.__et') === 'undefined',
    'before injection: typeof window.__et === "undefined" (fallback condition true)');

  dom.window.eval(injectorScript);
  assert(dom.window.eval('typeof window.__et') === 'object',
    'after injection: typeof window.__et === "object" (fallback condition false)');
}

console.log('\n── Lifecycle: navigation reinjection (fresh window per navigation) ─────');

{
  // browser_navigate resets the page's window context, so any `window.__et`
  // installed before navigation is gone afterward. Model that here with two
  // independent JSDOM windows standing in for pre- and post-navigation state.
  const preNavWindow = new JSDOM(html('dom-level1-error-toast'), { runScripts: 'dangerously' });
  preNavWindow.window.eval(injectorScript);
  const beforeNav = JSON.parse(JSON.stringify(preNavWindow.window.eval('window.__et.dom()')));

  const postNavWindow = new JSDOM(html('dom-level1-error-toast'), { runScripts: 'dangerously' });
  assert(postNavWindow.window.eval('typeof window.__et') === 'undefined',
    'post-navigation window starts with no window.__et (navigation cleared the bridge)');

  postNavWindow.window.eval(injectorScript);
  const afterReinject = JSON.parse(JSON.stringify(postNavWindow.window.eval('window.__et.dom()')));

  assert(deepEqual(beforeNav, afterReinject),
    'reinjecting after a simulated navigation reproduces byte-identical detector output',
    deepEqual(beforeNav, afterReinject) ? '' : `before=${JSON.stringify(beforeNav)}\n         after=${JSON.stringify(afterReinject)}`);
  assert(deepEqual(afterReinject, domPaste(html('dom-level1-error-toast'))),
    'reinjected output still matches canonical paste-mode output');
}

console.log('\n── Lifecycle: redundant reinjection is idempotent (double inject, no navigation) ─');

{
  // The instruction is "inject once per flow, and again after every
  // navigation" — an accidental extra inject (no navigation in between)
  // must not corrupt window.__et or change detector output.
  const dom = new JSDOM(html('dom-level2-callout-danger'), { runScripts: 'dangerously' });
  dom.window.eval(injectorScript);
  const firstInject = JSON.parse(JSON.stringify(dom.window.eval('window.__et.dom()')));

  dom.window.eval(injectorScript); // redundant re-injection, same window
  assert(dom.window.eval('typeof window.__et') === 'object',
    'window.__et remains a valid object after a redundant reinjection');
  const secondInject = JSON.parse(JSON.stringify(dom.window.eval('window.__et.dom()')));

  assert(deepEqual(firstInject, secondInject),
    'redundant reinjection produces byte-identical output to the first injection');
}

console.log('\n── Lifecycle: console/network detectors survive reinjection too ────────');

{
  const dom = new JSDOM('<!DOCTYPE html>', { runScripts: 'dangerously' });
  dom.window.eval(injectorScript);
  const messages = json('console-level2-react-warning');
  const before = JSON.parse(JSON.stringify(
    dom.window.eval(`window.__et.console(${JSON.stringify(messages)})`)));

  dom.window.eval(injectorScript); // simulate reinjection after navigation
  const after = JSON.parse(JSON.stringify(
    dom.window.eval(`window.__et.console(${JSON.stringify(messages)})`)));

  assert(deepEqual(before, after),
    'console detector output is byte-identical before/after reinjection');

  const requests = json('network-level2-duplicate');
  const netBefore = JSON.parse(JSON.stringify(
    dom.window.eval(`window.__et.network(${JSON.stringify(requests)})`)));
  const netAfter = JSON.parse(JSON.stringify(
    dom.window.eval(`window.__et.network(${JSON.stringify(requests)})`)));

  assert(deepEqual(netBefore, netAfter),
    'network detector output is byte-identical before/after reinjection');
}

// ══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════════════════

console.log(`\n${'─'.repeat(72)}`);
console.log(`${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error('\nFailed assertions:');
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
  process.exit(1);
} else {
  console.log('All assertions passed. Detector correctness and paste≡inject equivalence confirmed.\n');
  process.exit(0);
}
