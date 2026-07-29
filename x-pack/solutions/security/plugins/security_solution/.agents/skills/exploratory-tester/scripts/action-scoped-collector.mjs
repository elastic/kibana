#!/usr/bin/env node
/**
 * Action-scoped collector — pure reducer (shadow mode only, see action-scoped-collector.md).
 *
 * Deliberately NOT executed inside the Playwright server process. The bridge
 * script (see action-scoped-collector.md § "Bridge") buffers raw request/
 * response/console events there and drains them as plain JSON; this module
 * classifies that JSON. Keeping the classification logic out of the
 * `browser_run_code_unsafe` VM sandbox means it can be unit tested with plain
 * Node/fixtures (no jsdom, no live browser) and reused as an ordinary CLI tool.
 *
 * Usage (CLI):
 *   node action-scoped-collector.mjs <events.json> [<prior-state.json>]
 * Prints `{ level1, level2, level3, suppressed, state }` as JSON to stdout.
 * `state` is round-tripped: pass a prior call's `state` back in as
 * <prior-state.json> to get cumulative-history-aware classification across
 * the actions in one flow (see "Cumulative history" below). Omit it for the
 * first action in a flow.
 *
 * Usage (module):
 *   import { reduceAction } from './action-scoped-collector.mjs';
 *   const { level1, level2, level3, suppressed, state } = reduceAction(events, priorState);
 *
 * Extension note: this file is `.mjs`, not `.js`, unlike its sibling
 * check-dom-anomalies.js/classify-console.js/dedup-network.js — those are
 * pasted as literal source into browser_evaluate and never `import`ed, so
 * Node never needs to determine their module type. This file IS `import`ed
 * (by action-scoped-collector.test.mjs and, in shadow mode, by
 * phases/2-explore.md's CLI invocation) and uses real ESM `import`/`export`,
 * so `.mjs` avoids a module-type-sniffing warning on every run rather than
 * requiring a change to the shared plugin package.json's "type" field.
 *
 * Input shape (`events`):
 *   {
 *     network: NetworkEvent[],   // see below — required
 *     console: ConsoleEvent[],   // see below — optional, default []
 *     dom: { spinnerVisibleForMs: number|null },  // optional
 *   }
 *
 *   NetworkEvent: {
 *     method: string,
 *     url: string,               // full URL including query — see "Redaction" below
 *     status: number|null,       // null while pending
 *     ok: boolean|null,          // null while pending
 *     failure: string|null,      // network-level failure text (DNS, aborted, ...); null on a real HTTP response
 *     requestedAt: number,       // ms, relative to the action's own clock — only deltas matter
 *     respondedAt: number|null,  // ms; null while pending or on network-level failure
 *     resourceType: string,      // 'xhr' | 'fetch' | 'document' | ... (informational only)
 *     abandonedByNavigation?: boolean, // set by the bridge when the frame navigated away
 *                                      // before this request settled — see "Navigation reset" below.
 *   }
 *   ConsoleEvent: { type: string, text: string }  — same shape classify-console.js already consumes.
 *
 * No response/request bodies are accepted or produced anywhere in this module
 * — see the global constraint in the roadmap plan. `redactUrl` strips common
 * credential-shaped query parameter values before a URL is ever logged.
 */

import { readFileSync } from 'fs';

// ── Redaction ────────────────────────────────────────────────────────────

// Query parameter names (case-insensitive) whose values must never appear in
// a persisted finding or diff. Deliberately conservative — false positives
// (redacting a harmless param) are free; false negatives are not.
const SENSITIVE_PARAM_NAMES = /^(api[-_]?key|token|password|passwd|secret|auth(orization)?|session|cookie|bearer|access[-_]?token|refresh[-_]?token)$/i;

/**
 * Strips the values (not the names) of credential-shaped query parameters
 * from a URL. Never touches the path, and never inspects request/response
 * bodies (this module never receives them).
 * @param {string} url
 * @returns {string}
 */
export function redactUrl(url) {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return url;

  const base = url.slice(0, queryStart);
  const query = url.slice(queryStart + 1);
  const hashStart = query.indexOf('#');
  const hash = hashStart === -1 ? '' : query.slice(hashStart);
  const queryOnly = hashStart === -1 ? query : query.slice(0, hashStart);

  const redacted = queryOnly
    .split('&')
    .map((pair) => {
      if (!pair) return pair;
      const eq = pair.indexOf('=');
      const key = eq === -1 ? pair : pair.slice(0, eq);
      if (SENSITIVE_PARAM_NAMES.test(decodeURIComponent(key))) {
        return `${key}=%5BREDACTED%5D`;
      }
      return pair;
    })
    .join('&');

  return `${base}?${redacted}${hash}`;
}

// Pathname only (no scheme/host/query/hash) — this is what actually appears
// in console-message text like "500 @ /api/foo", so it's what "already
// surfaced via console" needs to match against, and it reads better in a
// finding's `path` field than repeating the full origin next to `url`.
function pathnameOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split('#')[0].split('?')[0];
  }
}

// Known-noise endpoints — same list dedup-network.js has always suppressed.
// Matched against the path (query-independent), same as today.
const POLLING = ['/health', '/status', '/metrics', '/fleet-setup', '/api/security/me'];
const isPolling = (path) => POLLING.some((p) => path.includes(p));

// Two exact-signature (method+full URL) responses this close together are
// treated as one render firing the same request twice, not two independent
// user-triggered calls. Chosen to comfortably cover same-tick/microtask
// duplication (the actual bug pattern) while not swallowing a deliberate
// quick double-click, which the "cancel/back-navigate" checklist step
// already exercises and expects to see reflected as two distinct findings.
const DUPLICATE_WINDOW_MS = 500;

// ── Reducer ──────────────────────────────────────────────────────────────

/**
 * @param {{network?: object[], console?: object[], dom?: {spinnerVisibleForMs?: number|null}}} action
 * @param {object} [priorState] - `state` returned by the previous call in this flow; omit for the first action.
 * @returns {{level1: object[], level2: object[], level3: object[], suppressed: object[], state: object}}
 */
export function reduceAction(action, priorState) {
  const network = action.network || [];
  const consoleMessages = action.console || [];
  const dom = action.dom || {};

  const level1 = [];
  const level2 = [];
  const level3 = [];
  const suppressed = [];

  const history = { ...(priorState && priorState.history) };

  // Console text is only used to decide whether a server error was *already*
  // surfaced elsewhere (Detector B still classifies console messages itself —
  // this reducer does not re-derive react-warning/infinite-rerender findings).
  const consoleText = consoleMessages.map((m) => m.text || '').join('\n');

  // Group by exact signature (method + full URL) — NOT method+path. Grouping
  // by path alone (as the legacy dedup-network.js does) misclassifies
  // meaningfully-different query strings (e.g. ?page=1 vs ?page=2) as
  // duplicates of each other; grouping by the full URL never does.
  const bySignature = new Map();
  for (const ev of network) {
    const sig = `${ev.method} ${ev.url}`;
    if (!bySignature.has(sig)) bySignature.set(sig, []);
    bySignature.get(sig).push(ev);
  }

  for (const [sig, events] of bySignature) {
    const [{ method, url }] = events;
    const path = pathnameOf(url);
    const redacted = redactUrl(url);

    if (isPolling(path)) {
      for (const ev of events) {
        suppressed.push({ type: 'noise', text: `${method} ${redacted} (known polling endpoint)` });
      }
      // Silent-server-error detection below still runs for polling paths —
      // suppressing duplicate noise is not the same as hiding a real outage.
    }

    events.sort((a, b) => a.requestedAt - b.requestedAt);

    // ── Silent server errors: a 5xx that produced no console message ───────
    for (const ev of events) {
      if (ev.status == null || ev.status < 500) continue;
      const alreadySurfaced = new RegExp(`\\b${ev.status}\\b`).test(consoleText) && consoleText.includes(path);
      if (alreadySurfaced) continue;
      level1.push({
        type: 'silent_server_error',
        method,
        path,
        url: redacted,
        status: ev.status,
        text: `${method} ${redacted} returned HTTP ${ev.status} with no corresponding console error — Detector B alone would miss this`,
      });
    }

    // ── Pending / stuck / navigation-abandoned requests ─────────────────────
    // A request still in flight when the frame navigates away will never
    // settle — Playwright's navigation tears it down. The bridge marks these
    // `abandonedByNavigation` so they read as "the page moved on", not as an
    // ever-worsening "stuck" signal across subsequent checklist steps.
    const abandoned = events.filter((ev) => ev.abandonedByNavigation && ev.status == null && ev.failure == null);
    for (const ev of abandoned) {
      level3.push({
        type: 'request_abandoned_by_navigation',
        method,
        path,
        url: redacted,
        text: `${method} ${redacted} was still in flight when the page navigated away — not counted as stuck`,
      });
    }

    const pendingNow = events.filter(
      (ev) => ev.status == null && ev.failure == null && !ev.abandonedByNavigation
    );
    if (pendingNow.length > 0) {
      const priorPendingSeenAt = history[sig] && history[sig].firstPendingAt;
      if (priorPendingSeenAt != null) {
        level2.push({
          type: 'stuck_request',
          method,
          path,
          url: redacted,
          text: `${method} ${redacted} has been pending since a previous checklist step and still has not resolved`,
        });
      } else if (!isPolling(path)) {
        level3.push({
          type: 'pending_request',
          method,
          path,
          url: redacted,
          text: `${method} ${redacted} had not resolved by the end of this action`,
        });
      }
    }

    // ── Duplicate vs. retry-after-failure vs. repeated-over-time ────────────
    const settled = events.filter((ev) => ev.status != null || ev.failure != null);
    if (settled.length >= 2 && !isPolling(path)) {
      const firstFailed = settled[0].failure != null || (settled[0].status != null && settled[0].status >= 400);
      const laterSucceeded = settled
        .slice(1)
        .some((ev) => ev.failure == null && ev.status != null && ev.status < 400);

      if (firstFailed && laterSucceeded) {
        level3.push({
          type: 'retry_after_failure',
          method,
          path,
          url: redacted,
          count: settled.length,
          text: `${method} ${redacted} failed then succeeded on retry (${settled.length} attempts) — looks like an intentional retry, not a duplicate-call bug`,
        });
      } else {
        const timings = settled.map((ev) => ev.requestedAt);
        const concurrent = timings.every(
          (t, i) => i === 0 || t - timings[i - 1] <= DUPLICATE_WINDOW_MS
        );
        if (concurrent) {
          level2.push({
            type: 'duplicate_api_call',
            method,
            path,
            url: redacted,
            count: settled.length,
            text: `Duplicate API call: ${method} ${redacted} called ${settled.length} times within ${DUPLICATE_WINDOW_MS}ms`,
            evidence: timings,
          });
        } else {
          level3.push({
            type: 'repeated_api_call',
            method,
            path,
            url: redacted,
            count: settled.length,
            text: `${method} ${redacted} called ${settled.length} times, spaced out over this action — not flagged as a duplicate-call bug, but worth a second look if unexpected`,
          });
        }
      }
    }

    // ── Update history for the next reduceAction call in this flow ─────────
    // `count` isn't read by any classification rule above — it exists so a
    // human reviewing a persisted collector-state-flow<N>.json file (see
    // action-scoped-collector.md) can see how many times a signature was
    // seen across the flow without re-deriving it from the diff files.
    const priorEntry = history[sig] || { count: 0, firstPendingAt: null };
    history[sig] = {
      count: priorEntry.count + events.length,
      firstPendingAt:
        priorEntry.firstPendingAt != null
          ? priorEntry.firstPendingAt
          : pendingNow.length > 0
          ? Date.now()
          : null,
    };
  }

  // ── Delayed elements: deterministic spinner-timing escalation ────────────
  // Replaces the agent-judgment-based "has it been visible >10s?" rule in
  // phases/2-explore.md with a computed one, given an explicit action clock.
  if (typeof dom.spinnerVisibleForMs === 'number') {
    if (dom.spinnerVisibleForMs > 10000) {
      level2.push({
        type: 'loading_indicator_unresolved',
        text: `Loading indicator unresolved after ${Math.round(dom.spinnerVisibleForMs / 1000)}s`,
      });
    } else {
      level3.push({
        type: 'spinner_present',
        text: `Spinner visible for ${Math.round(dom.spinnerVisibleForMs / 1000)}s (within the 10s grace period)`,
      });
    }
  }

  return { level1, level2, level3, suppressed, state: { history } };
}

// ── CLI entry point ───────────────────────────────────────────────────────

function isMainModule() {
  return import.meta.url === `file://${process.argv[1]}`;
}

if (isMainModule()) {
  const [eventsPath, statePath] = process.argv.slice(2);
  if (!eventsPath) {
    console.error('Usage: node action-scoped-collector.mjs <events.json> [<prior-state.json>]');
    process.exit(2);
  }
  const events = JSON.parse(readFileSync(eventsPath, 'utf8'));
  const priorState = statePath ? JSON.parse(readFileSync(statePath, 'utf8')) : undefined;
  const result = reduceAction(events, priorState);
  process.stdout.write(JSON.stringify(result));
}
