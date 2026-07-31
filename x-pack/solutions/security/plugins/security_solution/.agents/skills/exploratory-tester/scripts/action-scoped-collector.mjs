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
 * phases/2-flow-core.md's CLI invocation) and uses real ESM `import`/`export`,
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
 *     status: number|null,       // set as soon as response HEADERS arrive; may be non-null
 *                                 // while the request is still `pending` below (streaming body) —
 *                                 // informational/classification use only, never a completeness signal.
 *     ok: boolean|null,          // set together with `status`, same caveat.
 *     failure: string|null,      // network-level failure text (DNS, aborted, ...); null on a real HTTP response
 *     requestedAt: number,       // ms, relative to the action's own clock — only deltas matter
 *     respondedAt: number|null,  // ms — the ONE true completeness signal: null until the request has
 *                                 // *fully* finished (Playwright `requestfinished`/`requestfailed`, i.e.
 *                                 // the body has actually been consumed), not merely until headers
 *                                 // arrived. `pending`/`stuck`/`abandoned` classification below all key
 *                                 // off this, not off `status` — a response whose headers arrived but
 *                                 // whose body is still streaming/stalled must still read as pending.
 *     resourceType: string,      // 'xhr' | 'fetch' | 'document' | ... (informational only)
 *     abandonedByNavigation?: boolean, // set by the bridge when the frame navigated away
 *                                      // before this request settled — see "Navigation reset" below.
 *                                      // Excluded from silent-error and duplicate/retry/settled
 *                                      // classification even when `status` is non-null: headers
 *                                      // can genuinely arrive before navigation tears the request
 *                                      // down, but it never completed from the app's perspective.
 *     id?: number,                // bridge-assigned, unique per request instance for the page's
 *                                  // lifetime. Optional — hand-written fixtures may omit it, in which
 *                                  // case cross-call continuity for the same signature falls back to
 *                                  // "assume it's the same request" (the pre-existing, coarser
 *                                  // behavior). When present (always true for real bridge output), it
 *                                  // disambiguates "the same request is still pending" from "a new
 *                                  // request with the same URL started right as the old one settled" —
 *                                  // see "Cumulative history" below.
 *   }
 *   ConsoleEvent: { type: string, text: string }  — same shape classify-console.js already consumes.
 *
 * No response/request bodies are accepted or produced anywhere in this module
 * — see the global constraint in the roadmap plan. `redactUrl` strips common
 * credential-shaped query parameter values before a URL is ever logged.
 */

import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';

// ── Redaction ────────────────────────────────────────────────────────────

// Query parameter names (case-insensitive) whose values must never appear in
// a persisted finding or diff. Deliberately conservative — false positives
// (redacting a harmless param) are free; false negatives are not.
const SENSITIVE_PARAM_NAMES = /^(x[-_]?api[-_]?key|api[-_]?key|token|password|passwd|secret|client[-_]?secret|auth(orization)?|session|cookie|bearer|access[-_]?token|refresh[-_]?token)$/i;

// Non-cryptographic, deterministic — its only job is to turn two DIFFERENT
// secret values into two DIFFERENT (but still opaque) placeholders. Without
// this, redacting `?token=a` and `?token=b` to the exact same literal
// `token=%5BREDACTED%5D` would make the signature grouping below
// (method+URL) treat two genuinely different requests as one, hiding a real
// duplicate-call bug or merging unrelated pending/stuck tracking. Must stay
// byte-identical to the bridge's copy in action-scoped-collector.md — the
// parity test evaluates both against the same inputs.
function shortHash(value) {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) hash = (hash * 33) ^ value.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

/**
 * Strips the values (not the names) of credential-shaped query parameters
 * from a URL. Never touches the path, and never inspects request/response
 * bodies (this module never receives them). The redacted placeholder embeds
 * a short hash of the original value (never the value itself) so two
 * requests differing only in a sensitive param's value are not collapsed
 * into the same signature — see `shortHash` above.
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
      // A malformed %-sequence in the key must never throw and abort the
      // whole action's classification — same guard the bridge's inline copy
      // already has. Falling back to the raw (undecoded) key for the
      // SENSITIVE test is the conservative choice: it can only cause an
      // over-eager decodeURIComponent-required match to be missed, never an
      // unrelated key to be wrongly redacted.
      let decodedKey = key;
      try {
        decodedKey = decodeURIComponent(key);
      } catch {
        // leave decodedKey as the raw key
      }
      if (SENSITIVE_PARAM_NAMES.test(decodedKey)) {
        const value = eq === -1 ? '' : pair.slice(eq + 1);
        return `${key}=%5BREDACTED:${shortHash(value)}%5D`;
      }
      return pair;
    })
    .join('&');

  return `${base}?${redacted}${hash}`;
}

// Chromium auto-generates this exact console message for every failed
// resource load, regardless of whether app code logs anything of its own —
// verified against a real browser via the browser_run_code_unsafe bridge
// (see __tests__/fixtures/action-500-already-surfaced-browser-native.json).
// Critically, this auto-generated text never includes the request's
// path/URL, unlike the hand-authored "500 @ /api/foo"-style messages some
// app code produces. classify-console.js's own `\b50[0-9]\b` rule has no
// path requirement either, so this message ALWAYS makes Detector B report a
// Level 1 `server_error` for it — meaning a 5xx that produced this message
// is already surfaced by console, full stop, regardless of path. Without
// recognizing this pattern, `alreadySurfaced` below required a path match
// that this real, common message shape can never satisfy, so the "avoid
// double-reporting relative to Detector B" guard silently never fired for
// the single most common form of a truly-unhandled failed request.
// Verified against Chromium only — Firefox's equivalent browser-native
// message has not been captured, may differ in wording, and must not be
// assumed to match this pattern.
//
// Global + capturing (not scoped to a single status via interpolation) so
// one pass over consoleText can count *how many* native messages exist per
// status — see `countBrowserNativeLoadFailuresByStatus` below. Counting
// (rather than a bare presence test) matters because consoleText is the
// whole action's console joined together: presence alone would let one
// native 500 message wrongly cover *every* 500 in the action regardless of
// which specific request produced it, silently missing a second,
// genuinely-unsurfaced 500 to a different path.
//
// `.` intentionally does NOT match newlines here (no `s`/dotAll flag) —
// consoleText is newline-joined, and without that constraint "Failed to
// load resource:" from one console message could pair across a `\n` with a
// status number that actually belongs to a different, later message.
// `g` is required for `matchAll` to return every occurrence rather than just
// the first; it's constructed fresh on every call below rather than hoisted
// to module scope so nothing can accidentally call `.test()`/`.exec()` on a
// shared instance and get alternating results from its mutated `lastIndex`.
function countBrowserNativeLoadFailuresByStatus(consoleText) {
  const pattern = /Failed to load resource:.*\bresponded with a status of (\d+)\b/g;
  const counts = new Map();
  for (const match of consoleText.matchAll(pattern)) {
    const status = Number(match[1]);
    counts.set(status, (counts.get(status) || 0) + 1);
  }
  return counts;
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

  // ── Silent server errors: a 5xx that produced no console message ─────────
  // Excludes abandonedByNavigation: its `status` reflects headers that
  // genuinely arrived, but the request never completed from the app's
  // perspective — the page moved on before it could act on that response.
  // Reporting it as a Level 1 silent_server_error alongside the Level 3
  // request_abandoned_by_navigation finding for the exact same event would
  // be misleading double-counting, not a second independent problem.
  //
  // Deliberately action-wide (over all `network` events, sorted by time, not
  // grouped by signature) rather than nested inside the per-signature loop
  // below: `nativeFailureCountByStatus` is a shared pool consumed across
  // every event regardless of URL, so it must be walked in one pass in a
  // stable global order — grouping by signature first would let the
  // insertion order of unrelated signatures perturb which event claims which
  // native message.
  //
  // Two phases, deliberately not merged into one pass: an event with its own
  // path-specific console message (e.g. "500 @ /api/foo") is surfaced
  // regardless of native-message credits, so it must never compete for a
  // shared credit a *different*, genuinely-silent event needs. Checking
  // credits first (one combined pass, credit check before the path check)
  // let whichever event happened to sort first claim the only credit
  // available even when it didn't need one — a same-status, different-path
  // 500 pair could then flip between "both surfaced" and "one wrongly
  // silent" purely based on requestedAt order. Marking path-matches first
  // removes that dependency entirely: phase 2 only ever has to arbitrate
  // among events that truly have nothing of their own.
  const nativeFailureCountByStatus = countBrowserNativeLoadFailuresByStatus(consoleText);
  const networkByTime = [...network].sort((a, b) => a.requestedAt - b.requestedAt);
  const qualifying = networkByTime.filter(
    (ev) => ev.status != null && ev.status >= 500 && !ev.abandonedByNavigation
  );

  // Phase 1 consumes individual console messages, not a per-(status, path)
  // count — a per-key count still let two *different* keys double-spend the
  // *same* message whenever one path is a substring of the other (e.g.
  // "/api/data" and "/api/data/export": a single "500 @ /api/data/export"
  // message satisfies `text.includes(path)` for both keys independently,
  // since `text.includes("/api/data")` is also true). Tracking consumed
  // message indices in one shared Set, across every key, means a message
  // can back at most one surfaced event in total, however many different
  // paths it happens to textually overlap with. Iterating `qualifying` in
  // time order and taking the first unconsumed match is the same
  // first-come heuristic already accepted below for the native pool: which
  // *specific* same-status event a message attributes to when several
  // equally match it is a heuristic, not a guarantee, but no single message
  // can silently cover more than one event.
  const consumedMessageIndices = new Set();
  const surfacedByOwnMessage = new Set();
  for (const ev of qualifying) {
    const path = pathnameOf(ev.url);
    const statusPattern = new RegExp(`\\b${ev.status}\\b`);
    const matchIndex = consoleMessages.findIndex((msg, idx) => {
      if (consumedMessageIndices.has(idx)) return false;
      const text = msg.text || '';
      return statusPattern.test(text) && text.includes(path);
    });
    if (matchIndex !== -1) {
      consumedMessageIndices.add(matchIndex);
      surfacedByOwnMessage.add(ev);
    }
  }

  // Phase 2: distribute remaining native-message credits, in request order,
  // among whatever's left over from phase 1. Order can still matter here —
  // there is no request<->console-message ID linking in the underlying data
  // to attribute a specific own-path or native message to one request over
  // another when credits are scarcer than qualifying events sharing a key,
  // so which *specific* event reads as silent in that case is a heuristic,
  // not a guarantee. This is a narrower, accepted limitation (which event
  // gets flagged) rather than the bugs phase 1 avoids (a message silently
  // covering more events than it could plausibly describe).
  //
  // A native message carries no URL at all, so it can't be attributed to a
  // specific event even in principle — including an `abandonedByNavigation`
  // one, which is excluded from `qualifying` and therefore never claims its
  // own credit even when it plausibly produced the message. Reserving one
  // credit per (status, abandoned event) — subtracted from the shared pool
  // before any qualifying event gets to claim one — treats that ambiguity
  // conservatively: it assumes the abandoned event *did* produce the
  // message, so a qualifying event of the same status is reported as
  // silent rather than risk wrongly suppressing a genuinely-silent one. The
  // trade-off runs the other way from phase 1's fix: this can occasionally
  // flag a qualifying event that in fact had legitimate native coverage,
  // once an abandoned event of the same status has reserved it away — an
  // accepted false-positive risk in a detector whose whole purpose is
  // surfacing errors a false negative would otherwise hide.
  const abandonedCountByStatus = new Map();
  for (const ev of network) {
    if (ev.abandonedByNavigation && ev.status != null) {
      abandonedCountByStatus.set(ev.status, (abandonedCountByStatus.get(ev.status) || 0) + 1);
    }
  }
  for (const [status, reserved] of abandonedCountByStatus) {
    const available = nativeFailureCountByStatus.get(status) || 0;
    nativeFailureCountByStatus.set(status, Math.max(0, available - reserved));
  }

  const surfacedByNativeCredit = new Set();
  for (const ev of qualifying) {
    if (surfacedByOwnMessage.has(ev)) continue;
    const remaining = nativeFailureCountByStatus.get(ev.status) || 0;
    if (remaining > 0) {
      nativeFailureCountByStatus.set(ev.status, remaining - 1);
      surfacedByNativeCredit.add(ev);
    }
  }

  for (const ev of qualifying) {
    if (surfacedByOwnMessage.has(ev) || surfacedByNativeCredit.has(ev)) continue;
    const path = pathnameOf(ev.url);
    const redacted = redactUrl(ev.url);

    level1.push({
      type: 'silent_server_error',
      method: ev.method,
      path,
      url: redacted,
      status: ev.status,
      text: `${ev.method} ${redacted} returned HTTP ${ev.status} with no corresponding console error — Detector B alone would miss this`,
    });
  }

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
      // Silent-server-error detection above already ran for polling paths —
      // suppressing duplicate noise is not the same as hiding a real outage.
    }

    events.sort((a, b) => a.requestedAt - b.requestedAt);

    // ── Pending / stuck / navigation-abandoned requests ─────────────────────
    // "Still open" is decided by `respondedAt` (true completion), never by
    // `status` — a response whose headers arrived but whose body is still
    // streaming/stalled must still read as pending, not as settled.
    //
    // A request still open when the frame navigates away will never settle —
    // Playwright's navigation tears it down. The bridge marks these
    // `abandonedByNavigation` so they read as "the page moved on", not as an
    // ever-worsening "stuck" signal across subsequent checklist steps.
    const abandoned = events.filter((ev) => ev.abandonedByNavigation && ev.respondedAt == null && ev.failure == null);
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
      (ev) => ev.respondedAt == null && ev.failure == null && !ev.abandonedByNavigation
    );
    // Identity check for cross-call escalation: grouping is by signature
    // (method+URL), not by request instance, so a signature can go
    // pending → settle → a brand-new request starts, all before the next
    // drain. Without disambiguating by `id`, that brand-new request would
    // wrongly inherit the old `firstPendingAt` and get escalated to
    // `stuck_request` on its very first sighting. Only trust `id`-based
    // continuity when BOTH sides actually carry ids (real bridge output
    // always does); hand-written events without ids fall back to the
    // coarser "assume same request" behavior this reducer always had.
    const currentPendingIds = pendingNow.map((ev) => ev.id).filter((id) => id != null);
    const priorPendingIds = (history[sig] && history[sig].pendingRequestIds) || null;
    const idsKnown = currentPendingIds.length > 0 && priorPendingIds != null && priorPendingIds.length > 0;
    const continuesPriorPendingRequest = idsKnown
      ? currentPendingIds.some((id) => priorPendingIds.includes(id))
      : true;

    if (pendingNow.length > 0) {
      const priorPendingSeenAt = history[sig] && history[sig].firstPendingAt;
      if (priorPendingSeenAt != null && continuesPriorPendingRequest) {
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
    // Uses `status`/`failure` (known outcome), not `respondedAt` (full
    // completion) — classifying a duplicate/retry only needs to know each
    // attempt's outcome category, not whether its body finished downloading.
    // Excludes abandonedByNavigation: a request whose headers arrived but
    // was then torn down by navigation never completed as a real call the
    // app acted on. Counting it as a "settled" attempt let a same-URL retry
    // after an abandoned request read as duplicate_api_call/retry_after_failure
    // against a call that, from the app's perspective, never happened.
    const settled = events.filter((ev) => (ev.status != null || ev.failure != null) && !ev.abandonedByNavigation);
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
        // Total span from first to last, NOT each adjacent gap — a drifting
        // sequence like 0ms, 400ms, 800ms has every adjacent gap within the
        // 500ms window but spans 800ms overall, which is a steadily-repeating
        // pattern (repeated_api_call), not a tight simultaneous burst.
        const timings = settled.map((ev) => ev.requestedAt);
        const concurrent = timings[timings.length - 1] - timings[0] <= DUPLICATE_WINDOW_MS;
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
    const priorEntry = history[sig] || { count: 0, firstPendingAt: null, pendingRequestIds: null };
    history[sig] = {
      count: priorEntry.count + events.length,
      // Reset whenever this signature has nothing pending *right now* —
      // settled (succeeded/failed) or abandoned-by-navigation both count as
      // "not pending". Without this reset, a signature that goes
      // pending → settles → pending again (a brand-new request) would
      // wrongly inherit the old timestamp and get misclassified as
      // `stuck_request` on its second, unrelated sighting. Also reset (to a
      // fresh timestamp, not cleared) when ids prove the current pending
      // instance is NOT the one `firstPendingAt` was recorded for — see
      // `continuesPriorPendingRequest` above.
      firstPendingAt:
        pendingNow.length === 0
          ? null
          : continuesPriorPendingRequest && priorEntry.firstPendingAt != null
          ? priorEntry.firstPendingAt
          : Date.now(),
      pendingRequestIds: pendingNow.length === 0 ? null : currentPendingIds.length > 0 ? currentPendingIds : null,
    };
  }

  // ── Delayed elements: deterministic spinner-timing escalation ────────────
  // Replaces the agent-judgment-based "has it been visible >10s?" rule in
  // phases/2-flow-core.md with a computed one, given an explicit action clock.
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
  // `pathToFileURL` (unlike manual `file://${...}` concatenation) percent-
  // encodes the path the same way Node computes `import.meta.url`, so this
  // still matches on paths with spaces/unicode, and on Windows where
  // `process.argv[1]` uses `\` separators that a raw template string would not.
  if (!process.argv[1]) return false;
  return import.meta.url === pathToFileURL(process.argv[1]).href;
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
