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
const uninstallSrc = extractCodeBlock(doc, '### Uninstall');
// eslint-disable-next-line no-new-func
const install = new Function(`return (${installSrc});`)();
// eslint-disable-next-line no-new-func
const drain = new Function(`return (${drainSrc});`)();
// eslint-disable-next-line no-new-func
const uninstall = new Function(`return (${uninstallSrc});`)();

// ── Fake Playwright primitives — just enough surface for the bridge ────────

// Real Playwright Frame objects are stable object references (not strings),
// which matters here: onFrameNavigated's WeakMap and `entry.frame === frame`
// checks rely on reference identity, not value equality.
const MAIN_FRAME = { name: 'main' };
const IFRAME_1 = { name: 'iframe-1' };

class FakePage extends EventEmitter {
  constructor() {
    super();
    this._mainFrame = MAIN_FRAME;
  }
  mainFrame() {
    return this._mainFrame;
  }
  // Real Playwright `page.off` is just an EventEmitter#removeListener alias
  // (Node's EventEmitter already exposes `.off()`), so no override needed —
  // present only to make the fake's intended surface explicit.
}

// Every request defaults to the page's main frame unless a test explicitly
// constructs it against a child/iframe frame object, so existing tests that
// don't care about frame-scoping keep working unchanged.
class FakeRequest {
  constructor(method, url, resourceType = 'xhr', frame = MAIN_FRAME, isNavigationRequest = false) {
    this._method = method;
    this._url = url;
    this._resourceType = resourceType;
    this._failure = null;
    this._frame = frame;
    this._isNavigationRequest = isNavigationRequest;
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
  frame() {
    return this._frame;
  }
  isNavigationRequest() {
    return this._isNavigationRequest;
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

// A REAL cross-document navigation always issues the document-fetching
// request (isNavigationRequest() === true) before 'framenavigated' commits.
// Use this whenever a test wants an actual navigation, as opposed to
// emitting 'framenavigated' bare, which simulates a same-document
// (pushState/hash) navigation instead.
function navigate(page, frame, url = 'https://kibana.example/next-page') {
  page.emit('request', new FakeRequest('GET', url, 'document', frame, true));
  page.emit('framenavigated', frame);
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
  // Body never finishes — the frame navigates away instead (a real
  // cross-document navigation, not a same-document pushState).
  navigate(page, page.mainFrame());

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
  assert(/token=%5BREDACTED:[0-9a-z]+%5D/.test(d.console[0].text), 'the token key is preserved, redacted in the hashed [REDACTED:<hash>] form', d.console[0].text);
}

console.log('\n── Different sensitive values in console text redact to different placeholders ─');
page = new FakePage();
await install(page);
{
  page.emit('console', new FakeConsoleMessage('error', 'Failed to fetch /api/foo?token=aaa: 500'));
  page.emit('console', new FakeConsoleMessage('error', 'Failed to fetch /api/foo?token=bbb: 500'));
  const d = await drain(page);
  assert(d.console.length === 2, 'both console errors are buffered');
  assert(d.console[0].text !== d.console[1].text, 'different token values redact to different placeholders, not an identical opaque string', JSON.stringify(d.console));
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
// NAVIGATION ABANDONMENT: scoped to the frame that actually navigated
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── A main-frame navigation does NOT abandon an unrelated iframe\'s in-flight request ─');
page = new FakePage();
await install(page);
{
  const iframeReq = new FakeRequest('GET', 'https://widget.example/data', 'xhr', IFRAME_1);
  page.emit('request', iframeReq);
  // The main frame navigates away — the iframe's own request is unrelated.
  navigate(page, page.mainFrame());

  const d = await drain(page);
  const entry = d.network[0];
  assert(!!entry && entry.abandonedByNavigation === false, "an iframe's own in-flight request is not marked abandoned just because the main frame navigated", JSON.stringify(d));
}

console.log('\n── A child frame\'s OWN navigation abandons only that frame\'s own open requests ─');
page = new FakePage();
await install(page);
{
  const mainReq = new FakeRequest('GET', 'https://kibana.example/api/main-still-open');
  const iframeReq = new FakeRequest('GET', 'https://widget.example/data', 'xhr', IFRAME_1);
  page.emit('request', mainReq);
  page.emit('request', iframeReq);
  // Only the iframe navigates (e.g. it loads a new document internally).
  // Deliberately a non-colliding URL for the navigation request itself, so
  // it doesn't get confused with iframeReq's own "widget.example" URL below.
  navigate(page, IFRAME_1);

  const d = await drain(page);
  const iframeEntry = d.network.find((e) => e.url.includes('widget.example'));
  const mainEntry = d.network.find((e) => e.url.includes('main-still-open'));
  assert(!!iframeEntry && iframeEntry.abandonedByNavigation === true, "the child frame's own request is abandoned by its own frame's navigation", JSON.stringify(d));
  assert(!!mainEntry && mainEntry.abandonedByNavigation === false, "the main frame's unrelated request is untouched by a child frame's navigation", JSON.stringify(d));
}

console.log('\n── A main-frame navigation still abandons the main frame\'s own open request (no regression) ─');
page = new FakePage();
await install(page);
{
  const req = new FakeRequest('GET', 'https://kibana.example/api/main-request');
  page.emit('request', req);
  navigate(page, page.mainFrame());

  const d = await drain(page);
  const entry = d.network[0];
  assert(!!entry && entry.abandonedByNavigation === true, "the main frame's own request is still abandoned by the main frame's own navigation", JSON.stringify(d));
}

console.log('\n── A same-document (history.pushState) navigation does NOT abandon a still-running request ─');
page = new FakePage();
await install(page);
{
  const req = new FakeRequest('GET', 'https://kibana.example/api/still-loading');
  page.emit('request', req);
  // Playwright fires 'framenavigated' for pushState/hash-change navigation
  // exactly like a real one — but NO document-fetching request precedes it,
  // since nothing was actually torn down. Emitting 'framenavigated' bare
  // (unlike the navigate() helper used elsewhere) simulates exactly that.
  page.emit('framenavigated', page.mainFrame());

  const d = await drain(page);
  const entry = d.network[0];
  assert(!!entry && entry.abandonedByNavigation === false, 'a same-document navigation must not mark a still-open request abandoned', JSON.stringify(d));
  // It must still be able to escalate to pending_request/stuck_request on a
  // later drain, exactly as if no navigation had happened at all.
  const d2 = await drain(page);
  assert(d2.network.length === 1 && d2.network[0].id === entry.id, 'the request is still returned on a later drain, not wrongly compacted out as if it had settled', JSON.stringify(d2));
}

console.log('\n── A real navigation immediately after a same-document one still abandons correctly (flag reset, not stuck) ─');
page = new FakePage();
await install(page);
{
  const req = new FakeRequest('GET', 'https://kibana.example/api/still-loading-2');
  page.emit('request', req);
  page.emit('framenavigated', page.mainFrame()); // pushState — must not abandon
  navigate(page, page.mainFrame()); // a real navigation right after — must abandon

  const d = await drain(page);
  const entry = d.network.find((e) => e.url.includes('still-loading-2'));
  assert(!!entry && entry.abandonedByNavigation === true, "a real navigation right after a same-document one still abandons — the flag reset on the pushState event doesn't wrongly suppress it", JSON.stringify(d));
}

// ══════════════════════════════════════════════════════════════════════════
// UNINSTALL: precise teardown, no cross-talk with unrelated listeners
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Uninstall on a page that was never installed is a safe no-op ────────');
page = new FakePage();
{
  const r = await uninstall(page);
  assert(r.uninstalled === false && r.wasInstalled === false, 'uninstall() on a fresh page reports nothing to uninstall', JSON.stringify(r));
}

console.log('\n── Uninstall removes exactly the six collector listeners, nothing else ─');
page = new FakePage();
await install(page);
{
  const unrelatedListener = () => {};
  page.on('console', unrelatedListener); // simulates e.g. video-evidence recording sharing the same event
  assert(page.listenerCount('console') === 2, 'sanity: two console listeners attached before uninstall (collector + unrelated)');

  const r = await uninstall(page);
  assert(r.uninstalled === true && r.wasInstalled === true, 'uninstall() reports it removed a real installation', JSON.stringify(r));
  assert(page.listenerCount('request') === 0, 'the request listener is removed');
  assert(page.listenerCount('response') === 0, 'the response listener is removed');
  assert(page.listenerCount('requestfinished') === 0, 'the requestfinished listener is removed');
  assert(page.listenerCount('requestfailed') === 0, 'the requestfailed listener is removed');
  assert(page.listenerCount('framenavigated') === 0, 'the framenavigated listener is removed');
  assert(page.listenerCount('console') === 1, 'only the collector\'s OWN console listener is removed — the unrelated one set by something else on the page survives', page.listenerCount('console'));

  assert(page.__actionCollectorInstalled === false, 'the installed flag is cleared so a later install() call re-attaches cleanly');
}

console.log('\n── After uninstall, no further requests/console are buffered until re-installed ─');
page = new FakePage();
await install(page);
await uninstall(page);
{
  const req = new FakeRequest('GET', 'https://kibana.example/api/after-uninstall');
  page.emit('request', req); // no listener left to react to this
  page.emit('console', new FakeConsoleMessage('error', 'should not be captured'));
  assert(page.__actionCollectorBuffer === undefined, 'the buffer itself was deleted by uninstall, so nothing could have been pushed');

  const r = await install(page); // re-install for a later session/flow reusing this page
  assert(r.installed === true && r.alreadyInstalled === false, 'install() after a full uninstall re-attaches from scratch, not a stale alreadyInstalled: true', JSON.stringify(r));
  const req2 = new FakeRequest('GET', 'https://kibana.example/api/after-reinstall');
  page.emit('request', req2);
  const d = await drain(page);
  assert(d.network.length === 1 && d.network[0].url.includes('after-reinstall'), 'listeners re-attached by install() after uninstall work normally', JSON.stringify(d));
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
