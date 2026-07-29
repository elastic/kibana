/**
 * Executes the ACTUAL bridge snippets from action-scoped-collector.md — the
 * Install and Drain `async (page) => {...}` functions — against a fake,
 * EventEmitter-based Playwright `page`/`Request`/`Response` stand-in.
 *
 * Why this file exists: the bridge only ever runs inside a live
 * `browser_run_code_unsafe` VM sandbox, so every prior test suite here could
 * only unit-test the reducer (`action-scoped-collector.mjs`) and, at most,
 * extract-and-run the standalone `redact` snippet in isolation. Three
 * separate reviews of this feature each found a real bug that lived
 * exclusively in the bridge snippet's own logic (a buffer-trim that could
 * drop a pending entry, an async status-capture race, and — the reason this
 * file exists — conflating "response headers arrived" with "request fully
 * settled"). None of those would have been caught by a reducer-only test,
 * because the reducer only ever sees whatever shape the bridge hands it.
 * This file closes that gap by running the real bridge code end-to-end.
 *
 *   node x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/__tests__/action-scoped-collector-bridge.test.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOC_PATH = resolve(__dirname, '../action-scoped-collector.md');

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

// ── Extract the real bridge snippets from the doc (never hand-copied) ──────

function extractCodeBlock(doc, headingText) {
  const headingIdx = doc.indexOf(headingText);
  if (headingIdx === -1) throw new Error(`heading not found: ${headingText}`);
  const fenceStart = doc.indexOf('```js', headingIdx);
  const codeStart = fenceStart + '```js'.length;
  const codeEnd = doc.indexOf('```', codeStart);
  return doc.slice(codeStart, codeEnd).trim();
}

const doc = readFileSync(DOC_PATH, 'utf8');
const installSrc = extractCodeBlock(doc, '### Install');
const drainSrc = extractCodeBlock(doc, '### Drain');
// eslint-disable-next-line no-new-func
const install = new Function(`return (${installSrc});`)();
// eslint-disable-next-line no-new-func
const drain = new Function(`return (${drainSrc});`)();

// ── Fake Playwright primitives — just enough surface for the bridge ────────

class FakePage extends EventEmitter {
  constructor() {
    super();
    this._mainFrame = {};
  }
  mainFrame() {
    return this._mainFrame;
  }
}

class FakeRequest {
  constructor(method, url, resourceType = 'xhr') {
    this._method = method;
    this._url = url;
    this._resourceType = resourceType;
    this._failure = null;
  }
  method() {
    return this._method;
  }
  url() {
    return this._url;
  }
  resourceType() {
    return this._resourceType;
  }
  failure() {
    return this._failure;
  }
}

class FakeResponse {
  constructor(request, status, ok) {
    this._request = request;
    this._status = status;
    this._ok = ok;
  }
  request() {
    return this._request;
  }
  status() {
    return this._status;
  }
  ok() {
    return this._ok;
  }
}

class FakeConsoleMessage {
  constructor(type, text) {
    this._type = type;
    this._text = text;
  }
  type() {
    return this._type;
  }
  text() {
    return this._text;
  }
}

function byId(events, id) {
  return events.find((e) => e.id === id);
}

// ══════════════════════════════════════════════════════════════════════════
// INSTALL: idempotent listener attachment, non-idempotent state reset
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Install: first call attaches listeners, returns alreadyInstalled: false ─');
let page = new FakePage();
{
  const r = await install(page);
  assert(r.installed === true && r.alreadyInstalled === false, 'first install() call → installed, not already-installed', JSON.stringify(r));
  assert(page.listenerCount('request') === 1, 'exactly one request listener attached');
  assert(page.listenerCount('response') === 1, 'exactly one response listener attached');
  assert(page.listenerCount('requestfinished') === 1, 'exactly one requestfinished listener attached');
}

console.log('\n── Install: second call (same flow or defensively re-run) does not double-attach listeners ─');
{
  const r = await install(page);
  assert(r.installed === true && r.alreadyInstalled === true, 'second install() call → alreadyInstalled: true');
  assert(page.listenerCount('request') === 1, 'still exactly one request listener — no duplicate registration');
  assert(page.listenerCount('response') === 1, 'still exactly one response listener — no duplicate registration');
}

// ══════════════════════════════════════════════════════════════════════════
// RESPONSE vs REQUESTFINISHED: headers arriving is not the same as "done"
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Headers arrive (response) but body still streaming: NOT reported as settled ─');
page = new FakePage();
await install(page);
{
  const req = new FakeRequest('GET', 'https://kibana.example/api/export?token=secret123');
  page.emit('request', req);
  page.emit('response', new FakeResponse(req, 200, true));
  // No 'requestfinished' yet — simulating a stalled/streaming body.

  const d1 = await drain(page);
  const entry = d1.network[0];
  assert(!!entry, 'the request appears in the drained output at all', JSON.stringify(d1));
  assert(entry.status === 200, 'status is already populated from the response event', JSON.stringify(entry));
  assert(entry.respondedAt == null, 'respondedAt is still null — headers arriving must not mark this settled', JSON.stringify(entry));
  assert(!entry.url.includes('secret123'), 'the token query param is redacted even on a still-open request');

  // Drained but not yet reportedFinal — must be returned again on the next drain.
  const d2 = await drain(page);
  assert(d2.network.length === 1 && d2.network[0].id === entry.id, 'a still-open request is returned again on the next drain, not silently dropped', JSON.stringify(d2));

  // Now the body actually finishes.
  page.emit('requestfinished', req);
  const d3 = await drain(page);
  const finished = byId(d3.network, entry.id);
  assert(!!finished && finished.respondedAt != null, 'requestfinished sets respondedAt — the request now reads as settled', JSON.stringify(d3));

  // And it must not be returned a third time — drain compacted it out.
  const d4 = await drain(page);
  assert(d4.network.length === 0, 'a fully settled request is compacted out of the buffer after being reported once', JSON.stringify(d4));
}

console.log('\n── A request abandoned by navigation while its body is still streaming (status known, respondedAt null) is marked abandoned, not silently settled ─');
page = new FakePage();
await install(page);
{
  const req = new FakeRequest('GET', 'https://kibana.example/api/slow-export');
  page.emit('request', req);
  page.emit('response', new FakeResponse(req, 200, true));
  // Body never finishes — the frame navigates away instead.
  page.emit('framenavigated', page.mainFrame());

  const d = await drain(page);
  const entry = d.network[0];
  assert(!!entry && entry.abandonedByNavigation === true, 'a streaming-body request is marked abandonedByNavigation on navigation, even though status was already known', JSON.stringify(d));
  assert(entry.respondedAt == null, 'abandonment does not fabricate a respondedAt timestamp');
}

// ══════════════════════════════════════════════════════════════════════════
// CONSOLE REDACTION
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Console error text embedding a sensitive query param is redacted before buffering ─');
page = new FakePage();
await install(page);
{
  page.emit('console', new FakeConsoleMessage('error', 'Failed to fetch /api/foo?token=abc123&page=2: 500 (Internal Server Error)'));
  const d = await drain(page);
  assert(d.console.length === 1, 'the console error is buffered');
  assert(!d.console[0].text.includes('abc123'), 'the token value never appears in the drained console text', d.console[0].text);
  assert(d.console[0].text.includes('token=%5BREDACTED%5D'), 'the token key is preserved, redacted in the documented [REDACTED] form', d.console[0].text);
}

console.log('\n── Console messages with no sensitive content pass through unchanged (besides the 300-char cap) ─');
page = new FakePage();
await install(page);
{
  page.emit('console', new FakeConsoleMessage('error', 'TypeError: cannot read properties of undefined'));
  const d = await drain(page);
  assert(d.console[0].text === 'TypeError: cannot read properties of undefined', 'ordinary console text is untouched');
}

// ══════════════════════════════════════════════════════════════════════════
// FLOW RESET: install must clear stale state from a PREVIOUS flow
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── A second install() call (new flow) clears a still-open request and console text left over from the previous flow ─');
page = new FakePage();
await install(page); // flow 1 starts
{
  const staleReq = new FakeRequest('GET', 'https://kibana.example/api/flow1-leftover');
  page.emit('request', staleReq);
  // Never settles, never drained — simulating a flow that ended with an
  // open request still sitting in the buffer.
  page.emit('console', new FakeConsoleMessage('error', 'flow 1 leftover error'));

  const r = await install(page); // flow 2 starts — same page, same tab
  assert(r.alreadyInstalled === true, 'flow 2 install() call reports listeners were already attached');

  const d = await drain(page);
  assert(d.network.length === 0, "flow 2's first drain does not see flow 1's leftover open request", JSON.stringify(d));
  assert(d.console.length === 0, "flow 2's first drain does not see flow 1's leftover console error", JSON.stringify(d));
}

console.log('\n── Listeners keep working after a flow-reset install() call ─────────────');
page = new FakePage();
await install(page);
await install(page); // second flow
{
  const req = new FakeRequest('GET', 'https://kibana.example/api/flow2-request');
  page.emit('request', req);
  page.emit('response', new FakeResponse(req, 204, true));
  page.emit('requestfinished', req);
  const d = await drain(page);
  assert(d.network.length === 1 && d.network[0].status === 204, "flow 2's own requests are still captured normally after the reset", JSON.stringify(d));
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
  console.log('All assertions passed. Bridge snippet behavior confirmed end-to-end.\n');
  process.exit(0);
}
