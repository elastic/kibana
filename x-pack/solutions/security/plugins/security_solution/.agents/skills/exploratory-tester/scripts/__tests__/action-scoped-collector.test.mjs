/**
 * Test harness for the action-scoped collector's pure reducer
 * (action-scoped-collector.js). No test framework, plain assertions, exits
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
  assert(
    redactUrl('https://kibana.example/api?api_key=super-secret&q=1') === 'https://kibana.example/api?api_key=%5BREDACTED%5D&q=1',
    'redactUrl → strips api_key value, leaves unrelated params untouched'
  );
  assert(
    redactUrl('https://kibana.example/api?Authorization=Bearer%20xyz') === 'https://kibana.example/api?Authorization=%5BREDACTED%5D',
    'redactUrl → case-insensitive match on param name'
  );
  assert(
    redactUrl('https://kibana.example/api?q=1') === 'https://kibana.example/api?q=1',
    'redactUrl → URLs with no sensitive params are returned unchanged'
  );
  assert(redactUrl('https://kibana.example/api') === 'https://kibana.example/api', 'redactUrl → URLs with no query string are returned unchanged');

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
  const match = doc.match(/const SENSITIVE = [\s\S]*?\n  \};\n/);
  assert(!!match, 'action-scoped-collector.md contains the expected `const SENSITIVE` / `redact` bridge snippet');

  if (match) {
    const redactFromDoc = new Function(`${match[0]}\nreturn redact;`)();
    const cases = [
      'https://kibana.example/api?api_key=super-secret&q=1',
      'https://kibana.example/api?Authorization=Bearer%20xyz',
      'https://kibana.example/api?q=1',
      'https://kibana.example/api',
      'https://kibana.example/api?token=abc&session=xyz&page=3',
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
// CLI ROUND-TRIP
// ══════════════════════════════════════════════════════════════════════════

console.log('\n── CLI: module export and CLI invocation agree on classification ───────');
{
  // Exercised indirectly: the CLI entry point in action-scoped-collector.js
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
