/**
 * Test harness for the action-scoped collector's pure reducer
 * (action-scoped-collector.mjs). No test framework, plain assertions, exits
 * non-zero on failure — same style as equivalence.test.mjs.
 *
 * This module is NOT exercised against a live browser here — it only tests
 * the deterministic classification logic given pre-built event fixtures.
 * See action-scoped-collector-spike.md for the live-capability verification
 * this module's *upstream* bridge script depends on.
 *
 *   node x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/scripts/__tests__/action-scoped-collector.test.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { reduceAction, redactUrl } from '../action-scoped-collector.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, 'fixtures');

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

function json(name) {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), 'utf8'));
}

function typesOf(items) {
  return items.map((i) => i.type);
}

// ══════════════════════════════════════════════════════════════════════════
// BASELINE
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Baseline: clean action produces no findings ──────────────────────────');
{
  const r = reduceAction(json('action-clean'));
  assert(
    r.level1.length === 0 && r.level2.length === 0 && r.level3.length === 0 && r.suppressed.length === 0,
    'action-clean → all arrays empty'
  );
  assert(typeof r.state === 'object' && r.state.history, 'action-clean → state.history is always returned');
}

// ══════════════════════════════════════════════════════════════════════════
// SILENT SERVER ERRORS
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Silent HTTP 500: no console error was ever logged for it ────────────');
{
  const r = reduceAction(json('action-silent-500'));
  assert(r.level1.some((i) => i.type === 'silent_server_error'), 'action-silent-500 → Level 1 silent_server_error');
  assert(r.level1[0].status === 500, 'action-silent-500 → status is preserved on the finding');
  assert(
    r.level1[0].url.startsWith('https://kibana.example/internal/entity_analytics/monitoring/entity_source'),
    'action-silent-500 → full URL (redacted form) is preserved as evidence'
  );
}

console.log('\n── 500 already surfaced via console → not double-reported ──────────────');
{
  const r = reduceAction(json('action-500-already-surfaced'));
  assert(
    !r.level1.some((i) => i.type === 'silent_server_error'),
    'action-500-already-surfaced → no silent_server_error (Detector B already covers it)'
  );
}

console.log('\n── 500 surfaced only via the browser\'s own auto-generated console message (no path in text) → still not double-reported ──');
{
  // Regression test for a real gap found during Task 8 live browser validation
  // (browser_run_code_unsafe against a real fetch() 500 with no app-level error
  // handling at all): Chromium auto-logs "Failed to load resource: the server
  // responded with a status of 500 (Internal Server Error)" for every failed
  // load, with NO path/URL in the text — unlike the "500 @ /api/foo" shape the
  // action-500-already-surfaced fixture above uses. classify-console.js's own
  // `\b50[0-9]\b` rule has no path requirement, so Detector B always classifies
  // this message as a Level 1 server_error regardless of path. Before this
  // fixture existed, `alreadySurfaced`'s path-match requirement meant this
  // real, common message shape could never satisfy it, so the reducer wrongly
  // emitted a second, differently-worded Level 1 finding for the same event.
  const r = reduceAction(json('action-500-already-surfaced-browser-native'));
  assert(
    !r.level1.some((i) => i.type === 'silent_server_error'),
    'action-500-already-surfaced-browser-native → no silent_server_error (browser-native message already covers it, even without a path)'
  );
}

console.log(
  '\n── Two distinct 500s sharing a status but only ONE native message → the second is still reported (no cross-path leakage) ──'
);
{
  // P2 review finding on the fix above: consoleText is action-wide, so a
  // naive "does a native 500 message exist anywhere in this action"
  // presence check would let ONE native message wrongly cover EVERY 500 in
  // the action, silently missing a second, genuinely-unsurfaced 500 to a
  // different path. The fix consumes one message per qualifying event
  // instead of testing presence, so only as many events as there are
  // matching native messages get treated as already-surfaced.
  const r = reduceAction({
    network: [
      {
        method: 'GET',
        url: 'https://kibana.example/internal/entity_analytics/monitoring/entity_source',
        status: 500,
        ok: false,
        failure: null,
        requestedAt: 0,
        respondedAt: 100,
        resourceType: 'fetch',
      },
      {
        method: 'GET',
        url: 'https://kibana.example/internal/entity_analytics/risk_score',
        status: 500,
        ok: false,
        failure: null,
        requestedAt: 200,
        respondedAt: 300,
        resourceType: 'fetch',
      },
    ],
    console: [
      { type: 'error', text: 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)' },
    ],
  });
  const silentErrors = r.level1.filter((i) => i.type === 'silent_server_error');
  assert(
    silentErrors.length === 1,
    'two distinct 500s + one native message → exactly one silent_server_error survives, not zero',
    JSON.stringify(r.level1)
  );
  assert(
    !!silentErrors[0] && silentErrors[0].path === '/internal/entity_analytics/risk_score',
    'the second (later-in-time) 500 is the one still reported — the first claims the sole native message',
    JSON.stringify(silentErrors)
  );
}

console.log('\n── Two 500s with TWO native messages → both are covered, neither double-reported ──');
{
  const r = reduceAction({
    network: [
      {
        method: 'GET',
        url: 'https://kibana.example/internal/a',
        status: 500,
        ok: false,
        failure: null,
        requestedAt: 0,
        respondedAt: 100,
        resourceType: 'fetch',
      },
      {
        method: 'GET',
        url: 'https://kibana.example/internal/b',
        status: 500,
        ok: false,
        failure: null,
        requestedAt: 200,
        respondedAt: 300,
        resourceType: 'fetch',
      },
    ],
    console: [
      { type: 'error', text: 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)' },
      { type: 'error', text: 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)' },
    ],
  });
  assert(
    !r.level1.some((i) => i.type === 'silent_server_error'),
    'two 500s + two native messages → both are covered, zero silent_server_error findings',
    JSON.stringify(r.level1)
  );
}

console.log('\n── Different statuses each keep their own native-message pool (no cross-status leakage) ──');
{
  const r = reduceAction({
    network: [
      {
        method: 'GET',
        url: 'https://kibana.example/internal/a',
        status: 500,
        ok: false,
        failure: null,
        requestedAt: 0,
        respondedAt: 100,
        resourceType: 'fetch',
      },
      {
        method: 'GET',
        url: 'https://kibana.example/internal/b',
        status: 503,
        ok: false,
        failure: null,
        requestedAt: 200,
        respondedAt: 300,
        resourceType: 'fetch',
      },
    ],
    console: [
      { type: 'error', text: 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)' },
    ],
  });
  const silentErrors = r.level1.filter((i) => i.type === 'silent_server_error');
  assert(
    silentErrors.length === 1 && silentErrors[0].status === 503,
    'a native 500 message never covers a 503 — the 503 is still reported',
    JSON.stringify(silentErrors)
  );
}

console.log(
  '\n── One native message + one path-specific own message, same status, different paths → order must not matter ──'
);
{
  // Regression for a bug the "two distinct 500s + one native message" fix
  // above introduced: claiming the sole native-message credit strictly by
  // arrival order (before checking whether an event has its own path-
  // specific message) let a path-matched event steal the credit a
  // *different*, genuinely-silent event needed, purely depending on which
  // one sorted first. Both arrival orders below must produce the same,
  // correct result: zero silent_server_error findings, since every event
  // has *something* covering it (its own message or the native one).
  const networkFor = (bFirst) => [
    {
      method: 'GET',
      url: bFirst ? 'https://kibana.example/api/b' : 'https://kibana.example/api/a',
      status: 500,
      ok: false,
      failure: null,
      requestedAt: 0,
      respondedAt: 100,
      resourceType: 'fetch',
    },
    {
      method: 'GET',
      url: bFirst ? 'https://kibana.example/api/a' : 'https://kibana.example/api/b',
      status: 500,
      ok: false,
      failure: null,
      requestedAt: 200,
      respondedAt: 300,
      resourceType: 'fetch',
    },
  ];
  const consoleMessages = [
    { type: 'error', text: 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)' },
    { type: 'error', text: '500 @ /api/b' },
  ];

  const bSecond = reduceAction({ network: networkFor(false), console: consoleMessages });
  assert(
    bSecond.level1.filter((i) => i.type === 'silent_server_error').length === 0,
    '/api/b (own message) arrives SECOND → both /api/a (native credit) and /api/b (own message) are surfaced',
    JSON.stringify(bSecond.level1)
  );

  const bFirst = reduceAction({ network: networkFor(true), console: consoleMessages });
  assert(
    bFirst.level1.filter((i) => i.type === 'silent_server_error').length === 0,
    '/api/b (own message) arrives FIRST → /api/b must not steal the native credit /api/a needs; same result as above',
    JSON.stringify(bFirst.level1)
  );
}

console.log(
  '\n── Own-path-message matching is count-based, not presence-based: query variants must not share one credit unboundedly ──'
);
{
  // P2 review finding: a hand-authored message like "500 @ /api/data" never
  // includes the query string (pathnameOf strips it), so a presence test
  // (`consoleText.includes(path)`) would let ONE such message wrongly cover
  // every query-variant request to that path — two independent requests,
  // /api/data?page=1 and /api/data?page=2, are not the same request just
  // because they share a pathname.
  const eventFor = (query, requestedAt) => ({
    method: 'GET',
    url: `https://kibana.example/api/data?page=${query}`,
    status: 500,
    ok: false,
    failure: null,
    requestedAt,
    respondedAt: requestedAt + 50,
    resourceType: 'fetch',
  });

  const oneMessage = reduceAction({
    network: [eventFor(1, 0), eventFor(2, 100)],
    console: [{ type: 'error', text: '500 @ /api/data' }],
  });
  const oneMessageSilent = oneMessage.level1.filter((i) => i.type === 'silent_server_error');
  assert(
    oneMessageSilent.length === 1,
    'two query-variant 500s + ONE path-only own-message → exactly one is still reported, not zero',
    JSON.stringify(oneMessage.level1)
  );
  assert(
    !!oneMessageSilent[0] && oneMessageSilent[0].url.includes('page=2'),
    'the second (later-in-time) query variant is the one still reported — the first claims the sole own-message credit',
    JSON.stringify(oneMessageSilent)
  );

  const twoMessages = reduceAction({
    network: [eventFor(1, 0), eventFor(2, 100)],
    console: [
      { type: 'error', text: '500 @ /api/data' },
      { type: 'error', text: '500 @ /api/data' },
    ],
  });
  assert(
    !twoMessages.level1.some((i) => i.type === 'silent_server_error'),
    'two query-variant 500s + TWO path-only own-messages → both are covered, zero silent_server_error findings',
    JSON.stringify(twoMessages.level1)
  );
}

console.log(
  '\n── Pinning a known, documented limitation: an abandoned request\'s native message can still cover an unrelated real 500 ──'
);
{
  // P2 review finding, already called out in the code comment above the
  // native-credit pool but previously untested: an abandonedByNavigation
  // event never consumes its own credit (excluded from `qualifying`
  // entirely), so if the browser genuinely logged a native message for it,
  // that message stays in the shared pool and can be wrongly claimed by a
  // completely unrelated real 500 of the same status. This is pinned here
  // as documented, current (imperfect) behavior — not a regression to fix
  // silently — because there is no request<->message ID link in the data to
  // attribute the native message to the abandoned request specifically.
  const abandonedEvent = {
    method: 'GET',
    url: 'https://kibana.example/api/abandoned',
    status: 500,
    ok: false,
    failure: null,
    requestedAt: 0,
    respondedAt: null,
    abandonedByNavigation: true,
    resourceType: 'fetch',
  };
  const unrelatedRealEvent = {
    method: 'GET',
    url: 'https://kibana.example/api/unrelated',
    status: 500,
    ok: false,
    failure: null,
    requestedAt: 100,
    respondedAt: 150,
    resourceType: 'fetch',
  };
  const r = reduceAction({
    network: [abandonedEvent, unrelatedRealEvent],
    console: [
      { type: 'error', text: 'Failed to load resource: the server responded with a status of 500 (Internal Server Error)' },
    ],
  });
  assert(
    r.level3.some((i) => i.type === 'request_abandoned_by_navigation'),
    'the abandoned request still gets its own Level 3 finding, independent of the credit pool',
    JSON.stringify(r)
  );
  assert(
    !r.level1.some((i) => i.type === 'silent_server_error'),
    "documented limitation: the unrelated real 500 is wrongly covered by the abandoned request's leftover native-message credit — pinned, not silently expected to change",
    JSON.stringify(r.level1)
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PENDING / STUCK / ABANDONED
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Pending request: still in flight at the end of one action ───────────');
{
  const r = reduceAction(json('action-pending-request'));
  assert(r.level3.some((i) => i.type === 'pending_request'), 'action-pending-request → Level 3 pending_request');
  assert(
    !r.level2.some((i) => i.type === 'stuck_request'),
    'action-pending-request → not yet a Level 2 stuck_request on its first sighting'
  );
}

console.log('\n── Headers received but body still streaming: NOT settled — respondedAt, not status, decides "still open" ─');
{
  const r = reduceAction(json('action-headers-received-body-still-streaming'));
  assert(
    r.level3.some((i) => i.type === 'pending_request'),
    'action-headers-received-body-still-streaming → Level 3 pending_request even though status is already 200',
    JSON.stringify(r)
  );
  assert(
    !r.level1.length && !r.level2.length,
    'action-headers-received-body-still-streaming → not treated as a silent server error or duplicate',
    JSON.stringify(r)
  );
}

console.log('\n── Stuck request: still pending across a SECOND action (cumulative history) ─');
{
  const pendingEvent = {
    method: 'GET',
    url: 'https://kibana.example/internal/entity_analytics/entity_store/engine_state',
    status: null,
    ok: null,
    failure: null,
    requestedAt: 0,
    respondedAt: null,
    resourceType: 'xhr',
    id: 1,
  };
  const first = reduceAction({ network: [pendingEvent] });
  assert(
    first.level3.some((i) => i.type === 'pending_request'),
    'stuck-request setup → first action sees a plain pending_request'
  );

  const second = reduceAction({ network: [{ ...pendingEvent, requestedAt: 4000 }] }, first.state);
  assert(
    second.level2.some((i) => i.type === 'stuck_request'),
    'stuck-request → second action (with carried-over state) escalates to Level 2 stuck_request',
    JSON.stringify(second)
  );
  assert(
    !second.level3.some((i) => i.type === 'pending_request'),
    'stuck-request → escalated finding replaces the plain pending_request, not both'
  );
}

console.log('\n── Settle-then-repend: a request that fully resolves must not poison a LATER, unrelated pending sighting of the same signature ─');
{
  const pendingEvent = {
    method: 'GET',
    url: 'https://kibana.example/internal/entity_analytics/entity_store/engine_state',
    status: null,
    ok: null,
    failure: null,
    requestedAt: 0,
    respondedAt: null,
    resourceType: 'xhr',
  };
  const a1 = reduceAction({ network: [pendingEvent] });
  assert(a1.level3.some((i) => i.type === 'pending_request'), 'settle-then-repend A1 → plain pending_request');

  const a2 = reduceAction(
    { network: [{ ...pendingEvent, status: 200, ok: true, failure: null, requestedAt: 1000, respondedAt: 1050 }] },
    a1.state
  );
  assert(
    !a2.level1.length && !a2.level2.length && !a2.level3.length,
    'settle-then-repend A2 (settles cleanly) → no findings',
    JSON.stringify(a2)
  );

  const a3 = reduceAction({ network: [{ ...pendingEvent, requestedAt: 2000 }] }, a2.state);
  assert(
    a3.level3.some((i) => i.type === 'pending_request'),
    'settle-then-repend A3 (a brand-new pending request) → plain pending_request again, not stuck_request',
    JSON.stringify(a3)
  );
  assert(
    !a3.level2.some((i) => i.type === 'stuck_request'),
    'settle-then-repend A3 → NOT misclassified as stuck_request just because the signature was pending two actions ago',
    JSON.stringify(a3)
  );
}

console.log('\n── Abandon-then-repend: an abandoned-by-navigation request must not poison a LATER pending sighting either ─');
{
  const pendingEvent = {
    method: 'GET',
    url: 'https://kibana.example/internal/entity_analytics/entity_store/engine_state',
    status: null,
    ok: null,
    failure: null,
    requestedAt: 0,
    respondedAt: null,
    resourceType: 'xhr',
  };
  const a1 = reduceAction({ network: [pendingEvent] });
  const a2 = reduceAction({ network: [{ ...pendingEvent, requestedAt: 500, abandonedByNavigation: true }] }, a1.state);
  assert(
    a2.level3.some((i) => i.type === 'request_abandoned_by_navigation'),
    'abandon-then-repend A2 (abandoned after a genuine pending A1) → request_abandoned_by_navigation',
    JSON.stringify(a2)
  );

  const a3 = reduceAction({ network: [{ ...pendingEvent, requestedAt: 1000 }] }, a2.state);
  assert(
    a3.level3.some((i) => i.type === 'pending_request'),
    'abandon-then-repend A3 (a brand-new pending request) → plain pending_request, not stuck_request',
    JSON.stringify(a3)
  );
  assert(
    !a3.level2.some((i) => i.type === 'stuck_request'),
    'abandon-then-repend A3 → NOT misclassified as stuck_request after an abandonment that followed a genuine pending sighting',
    JSON.stringify(a3)
  );
}

console.log('\n── Same-drain settle+repend: an old request settling and a NEW same-URL request starting, both observed in ONE call, must not escalate the new one to stuck_request ─');
{
  const sig = {
    method: 'GET',
    url: 'https://kibana.example/internal/entity_analytics/entity_store/engine_state',
    resourceType: 'xhr',
  };
  const a1 = reduceAction({
    network: [{ ...sig, id: 1, status: null, ok: null, failure: null, requestedAt: 0, respondedAt: null }],
  });
  assert(a1.level3.some((i) => i.type === 'pending_request'), 'same-drain setup A1 → plain pending_request (id 1)');

  // A2, in ONE call: id 1 settles AND a brand-new id 2 for the identical
  // signature is already pending by the time this same drain fires.
  const a2 = reduceAction(
    {
      network: [
        { ...sig, id: 1, status: 200, ok: true, failure: null, requestedAt: 0, respondedAt: 1000 },
        { ...sig, id: 2, status: null, ok: null, failure: null, requestedAt: 950, respondedAt: null },
      ],
    },
    a1.state
  );
  assert(
    a2.level3.some((i) => i.type === 'pending_request'),
    'same-drain settle+repend A2 → the NEW request (id 2) is a plain pending_request',
    JSON.stringify(a2)
  );
  assert(
    !a2.level2.some((i) => i.type === 'stuck_request'),
    'same-drain settle+repend A2 → NOT escalated to stuck_request just because id 1 (a different, now-settled request) shares the same URL',
    JSON.stringify(a2)
  );

  // And the genuine continuation case must still escalate: id 2 (the one
  // actually left pending after A2) still pending in A3 → stuck_request.
  const a3 = reduceAction(
    { network: [{ ...sig, id: 2, status: null, ok: null, failure: null, requestedAt: 2000, respondedAt: null }] },
    a2.state
  );
  assert(
    a3.level2.some((i) => i.type === 'stuck_request'),
    'same-drain settle+repend A3 → id 2 genuinely continuing to be pending IS escalated to stuck_request',
    JSON.stringify(a3)
  );
}

console.log('\n── Navigation reset: an in-flight request abandoned by navigation is not "stuck" ─');
{
  const r = reduceAction(json('action-abandoned-by-navigation'));
  assert(
    r.level3.some((i) => i.type === 'request_abandoned_by_navigation'),
    'action-abandoned-by-navigation → Level 3 request_abandoned_by_navigation'
  );
  assert(
    !r.level3.some((i) => i.type === 'pending_request') && !r.level2.some((i) => i.type === 'stuck_request'),
    'action-abandoned-by-navigation → never counted as pending_request or stuck_request'
  );

  // And critically: it must not poison history so a LATER, genuinely-repeated
  // pending sighting of the same URL still starts from "first sighting", not
  // pre-escalated to stuck_request.
  const second = reduceAction(
    {
      network: [
        {
          method: 'GET',
          url: 'https://kibana.example/internal/entity_analytics/entity_store/engine_state',
          status: null,
          ok: null,
          failure: null,
          requestedAt: 100,
          respondedAt: null,
          resourceType: 'xhr',
        },
      ],
    },
    r.state
  );
  assert(
    second.level3.some((i) => i.type === 'pending_request') && !second.level2.some((i) => i.type === 'stuck_request'),
    'action-abandoned-by-navigation → a fresh pending sighting after an abandoned one is not pre-escalated'
  );
}

console.log('\n── An abandoned request with a known 5xx status is not a silent_server_error ──');
{
  // Headers arrived (status known) before the frame navigated away — the
  // status is real, but the request never completed from the app's
  // perspective. Reporting BOTH request_abandoned_by_navigation (Level 3)
  // and silent_server_error (Level 1) for the exact same event is
  // misleading double-counting, not two independent problems.
  const r = reduceAction({
    network: [
      {
        method: 'GET',
        url: 'https://kibana.example/internal/entity_analytics/monitoring/entity_source/status',
        status: 500,
        ok: false,
        failure: null,
        requestedAt: 0,
        respondedAt: null,
        resourceType: 'fetch',
        abandonedByNavigation: true,
      },
    ],
    console: [],
  });
  assert(!r.level1.some((i) => i.type === 'silent_server_error'), 'an abandoned request with a known 500 status → never Level 1 silent_server_error');
  assert(r.level3.some((i) => i.type === 'request_abandoned_by_navigation'), 'still correctly reported as Level 3 request_abandoned_by_navigation');
}

console.log('\n── A same-URL retry right after an abandoned (not truly settled) request is not a duplicate/retry ─');
{
  // The first attempt was torn down by navigation mid-flight (status known
  // from headers, but respondedAt never set) — from the app's perspective it
  // never completed, so a genuinely new call to the same URL right after is
  // a fresh first attempt, not a duplicate_api_call or retry_after_failure
  // against a call that, in effect, never happened.
  const r = reduceAction(json('action-abandoned-then-retry'));
  assert(
    !r.level2.some((i) => i.type === 'duplicate_api_call') && !r.level3.some((i) => i.type === 'retry_after_failure' || i.type === 'repeated_api_call'),
    'action-abandoned-then-retry → the abandoned attempt is excluded, so the real attempt is never classified as a duplicate/retry/repeat',
    JSON.stringify({ level2: r.level2, level3: r.level3 })
  );
  assert(
    r.level3.some((i) => i.type === 'request_abandoned_by_navigation'),
    'action-abandoned-then-retry → the abandoned attempt is still reported on its own terms'
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DUPLICATE CLASSIFICATION
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Meaningfully different queries are never grouped as duplicates ──────');
{
  const r = reduceAction(json('action-query-variants'));
  assert(
    !r.level2.some((i) => i.type === 'duplicate_api_call') && !r.level3.some((i) => i.type === 'repeated_api_call'),
    'action-query-variants (?page=1 vs ?page=2) → no duplicate/repeated finding for either'
  );
}

console.log('\n── Same exact call fired twice within the duplicate window → Level 2 ───');
{
  const r = reduceAction(json('action-duplicate-concurrent'));
  assert(r.level2.some((i) => i.type === 'duplicate_api_call'), 'action-duplicate-concurrent → Level 2 duplicate_api_call');
  const finding = r.level2.find((i) => i.type === 'duplicate_api_call');
  assert(finding.count === 2, 'action-duplicate-concurrent → count is 2');
  assert(Array.isArray(finding.evidence) && finding.evidence.length === 2, 'action-duplicate-concurrent → evidence timestamps preserved');
}

console.log('\n── Adjacent gaps within the window but a longer total span → NOT concurrent ─');
{
  // 0ms, 400ms, 800ms: every ADJACENT gap is 400ms (within the 500ms
  // window), but the TOTAL span from first to last is 800ms — a steadily
  // drifting/polling-like pattern, not a tight simultaneous burst. Checking
  // only adjacent gaps used to misclassify this as duplicate_api_call.
  const r = reduceAction(json('action-duplicate-drift'));
  assert(
    !r.level2.some((i) => i.type === 'duplicate_api_call'),
    'action-duplicate-drift (0/400/800ms, 400ms adjacent gaps) → never Level 2 duplicate_api_call'
  );
  assert(
    r.level3.some((i) => i.type === 'repeated_api_call'),
    'action-duplicate-drift → correctly classified as Level 3 repeated_api_call instead'
  );
}

console.log('\n── Intentional retry (fail, then succeed) is not a duplicate-call bug ──');
{
  const r = reduceAction(json('action-retry-after-failure'));
  assert(
    r.level3.some((i) => i.type === 'retry_after_failure'),
    'action-retry-after-failure → Level 3 retry_after_failure, not a bug-level finding'
  );
  assert(
    !r.level2.some((i) => i.type === 'duplicate_api_call'),
    'action-retry-after-failure → never double-counted as duplicate_api_call'
  );
}

console.log('\n── Same call repeated but spaced far apart → soft Level 3, not Level 2 ─');
{
  const r = reduceAction(json('action-repeated-spaced'));
  assert(r.level3.some((i) => i.type === 'repeated_api_call'), 'action-repeated-spaced → Level 3 repeated_api_call');
  assert(!r.level2.some((i) => i.type === 'duplicate_api_call'), 'action-repeated-spaced → not escalated to duplicate_api_call');
}

console.log('\n── Action boundaries: the same call succeeding in two SEPARATE actions is not a duplicate ─');
{
  const event = {
    method: 'GET',
    url: 'https://kibana.example/internal/entity_analytics/risk_score',
    status: 200,
    ok: true,
    failure: null,
    requestedAt: 0,
    respondedAt: 90,
    resourceType: 'xhr',
  };
  const first = reduceAction({ network: [event] });
  const second = reduceAction({ network: [{ ...event, requestedAt: 0 }] }, first.state);
  assert(
    !second.level2.some((i) => i.type === 'duplicate_api_call') && !second.level3.some((i) => i.type === 'repeated_api_call'),
    'two separate single-call actions are never combined into a cross-action duplicate finding'
  );
}

// ══════════════════════════════════════════════════════════════════════════
// KNOWN-NOISE SUPPRESSION
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Known polling endpoints are suppressed, not flagged as duplicates ───');
{
  const r = reduceAction(json('action-polling-noise'));
  assert(r.suppressed.length === 2, 'action-polling-noise → both calls land in suppressed[]');
  assert(
    !r.level2.some((i) => i.type === 'duplicate_api_call') && !r.level3.some((i) => i.type === 'repeated_api_call'),
    'action-polling-noise → never flagged as a duplicate/repeated finding'
  );
}

console.log('\n── A silently-failing polling endpoint is still surfaced despite suppression ─');
{
  const r = reduceAction({
    network: [
      {
        method: 'GET',
        url: 'https://kibana.example/api/security/me',
        status: 500,
        ok: false,
        failure: null,
        requestedAt: 0,
        respondedAt: 50,
        resourceType: 'xhr',
      },
    ],
  });
  assert(
    r.level1.some((i) => i.type === 'silent_server_error'),
    'a 500 on a polling endpoint is still a Level 1 silent_server_error — suppression only covers duplicate noise'
  );
}

// ══════════════════════════════════════════════════════════════════════════
// DELAYED ELEMENTS (deterministic spinner-timing escalation)
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Delayed elements: spinner visible > 10s escalates to Level 2 ────────');
{
  const r = reduceAction(json('action-spinner-delayed'));
  assert(
    r.level2.some((i) => i.type === 'loading_indicator_unresolved'),
    'action-spinner-delayed (15s) → Level 2 loading_indicator_unresolved'
  );
}

console.log('\n── Delayed elements: spinner within the 10s grace period stays Level 3 ─');
{
  const r = reduceAction(json('action-spinner-ok'));
  assert(r.level3.some((i) => i.type === 'spinner_present'), 'action-spinner-ok (3s) → Level 3 spinner_present');
  assert(
    !r.level2.some((i) => i.type === 'loading_indicator_unresolved'),
    'action-spinner-ok (3s) → not escalated to Level 2'
  );
}

// ══════════════════════════════════════════════════════════════════════════
// REDACTION
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── URL redaction: credential-shaped query params are never persisted ───');
{
  const REDACTED_RE = /^%5BREDACTED:[0-9a-z]+%5D$/;
  const valueOf = (redactedUrl, key) => {
    const m = new RegExp(`${key}=([^&#]+)`).exec(redactedUrl);
    return m && m[1];
  };

  assert(
    REDACTED_RE.test(valueOf(redactUrl('https://kibana.example/api?api_key=super-secret&q=1'), 'api_key')) &&
      redactUrl('https://kibana.example/api?api_key=super-secret&q=1').endsWith('&q=1'),
    'redactUrl → strips api_key value (leaving an opaque hashed placeholder), unrelated params untouched'
  );
  assert(
    REDACTED_RE.test(valueOf(redactUrl('https://kibana.example/api?Authorization=Bearer%20xyz'), 'Authorization')),
    'redactUrl → case-insensitive match on param name'
  );
  assert(
    redactUrl('https://kibana.example/api?q=1') === 'https://kibana.example/api?q=1',
    'redactUrl → URLs with no sensitive params are returned unchanged'
  );
  assert(redactUrl('https://kibana.example/api') === 'https://kibana.example/api', 'redactUrl → URLs with no query string are returned unchanged');
  assert(
    redactUrl('https://kibana.example/api?token=abc123#somefragment').endsWith('#somefragment') &&
      REDACTED_RE.test(valueOf(redactUrl('https://kibana.example/api?token=abc123#somefragment'), 'token')),
    'redactUrl → a hash fragment after a redacted sensitive param is preserved, not dropped'
  );
  assert(
    redactUrl('https://kibana.example/api?bad%zzkey=secret&page=2') === 'https://kibana.example/api?bad%zzkey=secret&page=2',
    'redactUrl → a malformed %-escape in a query KEY (decodeURIComponent throws) never aborts classification; it just fails to decode-and-match that one key',
    'threw instead of returning a value'
  );

  // Previously-missed credential-shaped names (P2 review finding).
  for (const key of ['x-api-key', 'x_api_key', 'client_secret', 'client-secret']) {
    const redacted = redactUrl(`https://kibana.example/api?${key}=super-secret&q=1`);
    assert(
      REDACTED_RE.test(valueOf(redacted, key)),
      `redactUrl → ${key} is redacted`,
      redacted
    );
  }

  // Redaction-before-grouping collision (P2 review finding): two DIFFERENT
  // values under the same sensitive key must produce DIFFERENT placeholders,
  // so the reducer's method+URL signature grouping never wrongly merges two
  // genuinely different requests into one just because both had a "token".
  const redactedA = redactUrl('https://kibana.example/api?token=a&page=1');
  const redactedB = redactUrl('https://kibana.example/api?token=b&page=1');
  assert(redactedA !== redactedB, 'redactUrl → different sensitive values produce different redacted placeholders (no signature collision)', `${redactedA} vs ${redactedB}`);
  // ...but the SAME value redacts to the SAME placeholder every time, so a
  // genuinely repeated call with a constant token is still grouped/detected
  // as a duplicate, not artificially split by a random per-call salt.
  assert(
    redactUrl('https://kibana.example/api?token=a&page=1') === redactedA,
    'redactUrl → the same sensitive value always redacts to the same placeholder (deterministic, not random)'
  );

  const withSecret = {
    method: 'GET',
    url: 'https://kibana.example/internal/foo?token=abc123&page=2',
    status: 200,
    ok: true,
    failure: null,
    requestedAt: 0,
    respondedAt: 50,
    resourceType: 'xhr',
  };
  const r = reduceAction({ network: [withSecret, { ...withSecret, requestedAt: 50 }] });
  const finding = r.level2.find((i) => i.type === 'duplicate_api_call');
  assert(finding && !finding.url.includes('abc123'), 'a finding built from a URL with a token query param never leaks the token value');

  // A duplicate finding built from two requests with DIFFERENT token values
  // must not exist — they are different signatures, not one duplicated call.
  const withSecretA = { ...withSecret, url: 'https://kibana.example/internal/foo?token=a&page=2' };
  const withSecretB = { ...withSecret, url: 'https://kibana.example/internal/foo?token=b&page=2', requestedAt: 50 };
  const r2 = reduceAction({ network: [withSecretA, withSecretB] });
  assert(
    !r2.level2.some((i) => i.type === 'duplicate_api_call'),
    'two requests differing only by a redacted-but-different token value are never merged into one duplicate_api_call finding'
  );
}

// ══════════════════════════════════════════════════════════════════════════
// BRIDGE REDACTION PARITY (action-scoped-collector.md's inline copy vs. redactUrl)
// The VM sandbox browser_run_code_unsafe code runs in has no `require`, so
// the bridge snippet in the doc duplicates redactUrl's logic by hand. This
// extracts that exact snippet from the doc and runs it directly, so an edit
// to either copy that breaks parity fails here instead of only being
// discovered against a live browser.
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Bridge redaction (doc snippet) agrees with redactUrl (reducer) ──────');
{
  const doc = readFileSync(resolve(__dirname, '../action-scoped-collector.md'), 'utf8');
  const match = doc.match(/const shortHash = [\s\S]*?return base \+ '\?' \+ rest \+ hash;\n  \};\n/);
  assert(!!match, 'action-scoped-collector.md contains the expected `const shortHash` / `const SENSITIVE` / `redact` bridge snippet');

  if (match) {
    const redactFromDoc = new Function(`${match[0]}\nreturn redact;`)();
    const cases = [
      'https://kibana.example/api?api_key=super-secret&q=1',
      'https://kibana.example/api?Authorization=Bearer%20xyz',
      'https://kibana.example/api?q=1',
      'https://kibana.example/api',
      'https://kibana.example/api?token=abc&session=xyz&page=3',
      // Regression case: the bridge's inline redact used to drop a trailing
      // hash fragment whenever the sensitive param was the last query pair
      // (it replaced the whole pair, hash included, with `key=[REDACTED]`),
      // while redactUrl always carved the hash out separately and kept it.
      'https://kibana.example/api?token=abc123#somefragment',
      'https://kibana.example/api?q=1#somefragment',
      'https://kibana.example/api?bad%zzkey=secret&page=2',
      // Previously-missing credential-shaped names (P2 review finding).
      'https://kibana.example/api?x-api-key=super-secret&q=1',
      'https://kibana.example/api?client_secret=super-secret&q=1',
      'https://kibana.example/api?client-secret=super-secret&q=1',
      // Redaction-before-grouping collision (P2 review finding): the bridge
      // and reducer must agree not just that these are redacted, but on the
      // SAME hashed placeholder for the SAME value.
      'https://kibana.example/api?token=a&page=1',
      'https://kibana.example/api?token=b&page=1',
    ];
    for (const url of cases) {
      assert(
        redactFromDoc(url) === redactUrl(url),
        `bridge doc snippet and redactUrl agree on: ${url}`,
        `doc=${redactFromDoc(url)}\n         reducer=${redactUrl(url)}`
      );
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════
// LIVE-CAPTURED FIXTURES (Task 8 seeded-harness validation, real browser)
//
// Each live-drain-scenario*.json is a verbatim drain captured via the
// browser_run_code_unsafe bridge against
// ../manual-tools/seeded-live-harness.html, not hand-authored like the
// fixtures above. Parametrized here so a future reducer change that
// silently alters one of these six scenarios' outcomes fails a test run
// instead of only being noticed on the next manual MCP pass — see
// ../reports/task8-live-validation-report.md for the full narrative.
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── Live-captured fixtures: documented outcome per scenario is pinned ───');
{
  const expectations = [
    {
      name: 'live-drain-scenario3-query-variants',
      describe: 'three ?q=/?page= variants of the same path',
      check: (r) =>
        r.level1.length === 0 && r.level2.length === 0 && r.level3.length === 0,
      label: 'query-variants → 0 findings (full-URL grouping correctly treats them as distinct)',
    },
    {
      name: 'live-drain-scenario4-duplicate-click',
      describe: 'the same exact call fired twice in quick succession, overlapping in flight',
      check: (r) => r.level2.some((i) => i.type === 'duplicate_api_call'),
      label: 'duplicate-click → Level 2 duplicate_api_call',
    },
    {
      name: 'live-drain-scenario6-known-noise-genuine-failure',
      describe:
        '5 sequential (non-overlapping) polls to a seeded endpoint, one of which fails with a 500',
      // Documented gap, not a silently-expected pass: DUPLICATE_WINDOW_MS is
      // a time-span threshold, not an in-flight-overlap check, so five
      // sequential polls landing within 500ms of each other are flagged as
      // duplicate_api_call exactly like a genuine double-submit would be.
      // See ../reports/task8-live-validation-report.md's "Known limitations" — an
      // overlap check (are two requests for the same signature ever
      // in-flight at the same time?) would distinguish this from a true
      // duplicate without relying on a path allowlist. The genuine failure
      // itself is correctly not double-reported (0 Level 1).
      check: (r) =>
        r.level1.length === 0 &&
        r.level2.some((i) => i.type === 'duplicate_api_call' && i.count === 5),
      label:
        'known-noise-genuine-failure → 0 Level 1 (no double-report), but a documented Level 2 ' +
        'false positive on the sequential polling (duplicate_api_call, count 5) — tracked, not silently expected to disappear',
    },
    {
      name: 'live-drain-scenario7-permission-gating',
      describe: 'a 403 from an admin-only endpoint',
      check: (r) => r.level1.length === 0 && r.level2.length === 0,
      label: 'permission-gating (403) → 0 Level 1/2 findings (status < 500 is out of scope by design)',
    },
    {
      name: 'live-drain-scenario8-cancellation',
      describe: 'a request cancelled by the user before it settles',
      check: (r) => r.level1.length === 0 && r.level2.length === 0 && r.level3.length === 0,
      label: 'cancellation → 0 findings (correctly silent)',
    },
    {
      name: 'live-drain-scenario9-refresh-mid-request',
      describe: 'a page refresh while a request is still in flight',
      check: (r) => r.level3.some((i) => i.type === 'request_abandoned_by_navigation'),
      label: 'refresh-mid-request → Level 3 request_abandoned_by_navigation (value-add over legacy, which has no equivalent)',
    },
  ];

  for (const { name, describe, check, label } of expectations) {
    const r = reduceAction(json(name));
    assert(check(r), `${name} (${describe}) → ${label}`, JSON.stringify({ level1: r.level1, level2: r.level2, level3: r.level3 }));
  }
}

// ══════════════════════════════════════════════════════════════════════════
// CLI ROUND-TRIP
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── CLI: module export and CLI invocation agree on classification ───────');
{
  // Exercised indirectly: the CLI entry point in action-scoped-collector.mjs
  // calls the exact same reduceAction() this file already imports, so no
  // separate spawn-based test is needed to prove classification parity —
  // spawning is left to a lighter smoke check of argument handling.
  const { execFileSync } = await import('child_process');
  const scriptPath = resolve(__dirname, '../action-scoped-collector.mjs');
  const fixturePath = join(FIXTURES_DIR, 'action-silent-500.json');
  const stdout = execFileSync('node', [scriptPath, fixturePath], { encoding: 'utf8' });
  const parsed = JSON.parse(stdout);
  assert(
    parsed.level1.some((i) => i.type === 'silent_server_error'),
    'CLI invocation on action-silent-500.json → same Level 1 classification as the module call'
  );
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
  console.log('All assertions passed. Action-scoped collector classification confirmed.\n');
  process.exit(0);
}
