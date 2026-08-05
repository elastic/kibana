# Action-scoped collector (shadow mode)

**Status: shadow-only, off by default.** This never drives findings. Legacy Detectors A/B/C (`check-dom-anomalies.js`, `classify-console.js`, `dedup-network.js` via the injected bridge from `phases/2-explore.md`) remain the sole source of findings in every session, regardless of `collector_mode`. This collector's entire purpose is to run *alongside* them, record where its classification would have differed, and let a human review those diffs before any promotion decision — see the roadmap plan's completion criterion: "Shadow collector mismatches are measurable, persisted, and reviewed before promotion."

**Before setting `collector_mode: shadow` in any real session, read `action-scoped-collector-spike.md` and run its one-time manual verification.** The runtime self-test below (§ "Runtime self-test") catches gross failures automatically, but it is not a substitute for that manual spike.

## Architecture

```
page.on('request'/'response'/'requestfinished'/'requestfailed'/'framenavigated'/'console')
  → buffered on the Playwright-side page object itself (survives navigation, survives separate tool calls)
  → drained as plain JSON via a second browser_run_code_unsafe call (never response/request bodies)
  → classified by the pure reducer, action-scoped-collector.mjs (Node-side, unit-tested, no browser dependency)
  → diffed against whatever Detectors A/B/C already found for the same checklist step
  → diff saved to $SESSION_DIR/collector-diffs/ — never fed back into findings-flow-<N>.md
```

This split exists because `browser_run_code_unsafe` executes inside a `vm.createContext` sandbox with no `require`/`import` access (see [`runCode.ts`](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/tools/backend/runCode.ts)) — the classification logic cannot live there. Only the minimal event-buffering code below runs in that sandbox; everything else is an ordinary, testable Node module.

## Bridge (Playwright-side — paste into `browser_run_code_unsafe`)

### Install (once per flow, before the first navigation into the flow)

```js
async (page) => {
  // Reset per-flow state on EVERY call, even when listeners are already
  // attached — this must run once at the start of every flow, not once ever
  // for the page's whole lifetime. Otherwise a still-pending or just-
  // abandoned entry from the PREVIOUS flow lingers in the buffer and gets
  // reported as if it belonged to the new flow on its very first drain.
  page.__actionCollectorBuffer = [];
  page.__actionCollectorConsole = [];
  // Reset every flow, same as the buffers above — NOT gated behind the
  // alreadyInstalled guard below. A navigation request that never resolves
  // into a 'framenavigated' (cancelled, superseded by another navigation)
  // would otherwise leave a stale "seen" entry for its frame that survives
  // into a LATER flow entirely, wrongly priming its next pushState to
  // abandon everything. See "Why 'framenavigated' alone is not enough".
  //
  // Keyed by Frame, valued by the *specific* in-flight navigation Request
  // objects seen for it since the last 'framenavigated' processed for that
  // frame (a Set, not a boolean) — onRequestFailed/onRequestFinished below
  // remove a request from its frame's set as soon as that specific attempt
  // resolves one way or another, so a cancelled/superseded navigation can't
  // poison a later, unrelated same-document navigation on the same frame.
  page.__actionCollectorNavRequestSeen = new WeakMap();

  if (page.__actionCollectorInstalled) return { installed: true, alreadyInstalled: true };

  // WeakMap, not Map: entries are only ever looked up by the Request object
  // itself (never iterated), so once Playwright drops its own reference to an
  // old Request (long after it settles), this entry becomes GC-eligible too
  // instead of growing unboundedly for the life of the page.
  page.__actionCollectorRequests = new WeakMap();
  page.__actionCollectorNextId = 1;

  // Non-cryptographic, deterministic — its only job is to turn two DIFFERENT
  // secret values into two DIFFERENT (but still opaque) placeholders. Without
  // this, redacting `?token=a` and `?token=b` to the exact same literal
  // `token=%5BREDACTED%5D` would make the reducer's signature grouping
  // (method+URL, computed from this already-redacted URL — see
  // action-scoped-collector.mjs) treat two genuinely different requests as
  // one, which can hide a real duplicate-call bug or merge unrelated
  // pending/stuck tracking. Must stay byte-identical to the reducer's copy —
  // the parity test below evaluates both against the same inputs.
  const shortHash = (value) => {
    let hash = 5381;
    for (let i = 0; i < value.length; i++) hash = (hash * 33) ^ value.charCodeAt(i);
    return (hash >>> 0).toString(36);
  };
  const SENSITIVE = /^(x[-_]?api[-_]?key|api[-_]?key|token|password|passwd|secret|client[-_]?secret|auth(orization)?|session|cookie|bearer|access[-_]?token|refresh[-_]?token)$/i;
  const redact = (url) => {
    const q = url.indexOf('?');
    if (q === -1) return url;
    const base = url.slice(0, q);
    const query = url.slice(q + 1);
    const h = query.indexOf('#');
    const hash = h === -1 ? '' : query.slice(h);
    const queryOnly = h === -1 ? query : query.slice(0, h);
    const rest = queryOnly.split('&').map((pair) => {
      const eq = pair.indexOf('=');
      const key = eq === -1 ? pair : pair.slice(0, eq);
      const value = eq === -1 ? '' : pair.slice(eq + 1);
      try { if (SENSITIVE.test(decodeURIComponent(key))) return key + '=%5BREDACTED:' + shortHash(value) + '%5D'; } catch (e) {}
      return pair;
    }).join('&');
    return base + '?' + rest + hash;
  };
  // Same credential-shaped names, but matched anywhere in free text as
  // `key=value` — console messages routinely embed the failing URL verbatim
  // (e.g. "Failed to fetch /api/foo?token=xyz: 500"), and `redact` above only
  // ever sees structured request URLs, never console text.
  const SENSITIVE_KV = /\b(x[-_]?api[-_]?key|api[-_]?key|token|password|passwd|secret|client[-_]?secret|auth(?:orization)?|session|cookie|bearer|access[-_]?token|refresh[-_]?token)=([^\s&#'")]+)/gi;
  const redactText = (text) => text.replace(SENSITIVE_KV, (_m, key, value) => key + '=%5BREDACTED:' + shortHash(value) + '%5D');

  // Playwright documents that request.frame() throws for two request kinds:
  // one from a Service Worker (request.serviceWorker() non-null), and a
  // navigation request issued before its frame exists yet. Both are real,
  // expected occurrences, not exceptional failures — never let either one
  // throw out of an event handler and silently stop that request (or a
  // sibling event) from ever being buffered at all.
  const frameOf = (req) => {
    try {
      return req.frame();
    } catch (e) {
      return null;
    }
  };
  const onRequest = (req) => {
    const frame = frameOf(req);
    const isNav = req.isNavigationRequest();
    // A real cross-document navigation always issues the document-fetching
    // request itself first, before 'framenavigated' commits — this is the
    // only public-API signal available to tell that apart from a same-
    // document (pushState/hash) navigation, which issues no request at all.
    // Skipped when frame is unavailable: with no frame to key by, this
    // request can't contribute a per-frame abandonment signal anyway.
    if (isNav && frame) {
      if (!page.__actionCollectorNavRequestSeen.has(frame)) {
        page.__actionCollectorNavRequestSeen.set(frame, new Set());
      }
      page.__actionCollectorNavRequestSeen.get(frame).add(req);
    }
    const entry = {
      id: page.__actionCollectorNextId++,
      method: req.method(), url: redact(req.url()),
      status: null, ok: null, failure: null,
      requestedAt: Date.now(), respondedAt: null,
      resourceType: req.resourceType(), abandonedByNavigation: false,
      // Internal only — never included in drain()'s output. Lets
      // 'framenavigated' below abandon only THIS request's own frame's
      // in-flight requests, not every open request page-wide. Stays `null`
      // (never scoped to, and therefore never abandoned by, any frame's
      // navigation) when frame() was unavailable above.
      frame,
      // Internal only. The navigation request that CAUSES a 'framenavigated'
      // commit can still be open (respondedAt still null) at that exact
      // moment — a slow/streaming document's own request must never be
      // marked abandoned by the very navigation it is driving. See
      // onFrameNavigated below.
      isNavigationRequest: isNav,
    };
    page.__actionCollectorBuffer.push(entry);
    page.__actionCollectorRequests.set(req, entry);
    // Defensive backstop only — normally the drain call below compacts
    // already-reported entries out of the buffer on every checklist step, so
    // this rarely has anything to do. If it ever does, it must never drop a
    // still-pending entry: only entries already marked __reportedFinal (i.e.
    // drain has nothing left to learn from them) are eligible for removal.
    if (page.__actionCollectorBuffer.length > 2000) {
      let removed = 0;
      for (let i = 0; i < page.__actionCollectorBuffer.length && removed < 500; ) {
        if (page.__actionCollectorBuffer[i].__reportedFinal) {
          page.__actionCollectorBuffer.splice(i, 1);
          removed++;
        } else {
          i++;
        }
      }
    }
  };
  // 'response' fires as soon as HEADERS arrive — status/ok are informational
  // and may be set well before the body finishes downloading. This is
  // intentionally NOT where the request is considered "done": see
  // 'requestfinished'/'requestfailed' below, which set `respondedAt`, the
  // one true completeness signal the reducer keys "pending"/"stuck" off.
  const onResponse = (res) => {
    const entry = page.__actionCollectorRequests.get(res.request());
    if (!entry) return;
    entry.status = res.status(); entry.ok = res.ok();
  };
  // Removes a settled navigation request from its frame's "seen" set —
  // whether it succeeded or failed, THIS specific attempt is done and must
  // stop contributing to a future 'framenavigated' decision on that frame.
  // Safe to do even on success: a real navigation's own request finishing
  // its body download always happens after 'framenavigated' has already
  // committed (and already consumed/cleared the set) for a successful
  // navigation, so this is a no-op then — it only matters for the case that
  // motivates it: a cancelled/superseded navigation request that will never
  // trigger 'framenavigated' at all, which must not poison a later,
  // unrelated same-document navigation on the same frame.
  const forgetSettledNavRequest = (req) => {
    const frame = frameOf(req);
    const set = frame && page.__actionCollectorNavRequestSeen.get(frame);
    if (set) set.delete(req);
  };
  const onRequestFinished = (req) => {
    forgetSettledNavRequest(req);
    const entry = page.__actionCollectorRequests.get(req);
    if (!entry) return;
    entry.respondedAt = Date.now();
  };
  const onRequestFailed = (req) => {
    forgetSettledNavRequest(req);
    const entry = page.__actionCollectorRequests.get(req);
    if (!entry) return;
    entry.failure = (req.failure() && req.failure().errorText) || 'unknown';
    entry.respondedAt = Date.now();
  };
  // Scoped to the SPECIFIC frame that navigated, not "any main-frame nav
  // abandons everything": a main-frame navigation to a new document tears
  // down that frame's own requests, but an unrelated iframe's in-flight
  // request (e.g. a widget loading independently) is untouched by it and
  // must not be falsely marked abandoned. Symmetrically, a CHILD frame's own
  // navigation must abandon that child frame's own open requests — the old
  // `if (frame !== page.mainFrame()) return;` guard silently ignored those
  // entirely.
  //
  // 'framenavigated' fires for same-document navigations too (Playwright
  // treats history.pushState()/hash changes as a navigation event), which
  // tear down nothing — the JS context and every in-flight request survive
  // unchanged. Only abandon this frame's open requests if a real
  // document-fetching navigation request was actually seen for it since the
  // last time this handler ran for it — see "Why 'framenavigated' alone is
  // not enough" below.
  const onFrameNavigated = (frame) => {
    const navSet = page.__actionCollectorNavRequestSeen.get(frame);
    const isRealDocumentNavigation = !!navSet && navSet.size > 0;
    if (navSet) navSet.clear();
    if (!isRealDocumentNavigation) return;
    for (const entry of page.__actionCollectorBuffer) {
      // Excludes the navigation request(s) that CAUSED this very commit
      // (and any of their redirect hops, which are separate Request objects
      // with isNavigationRequest() also true): 'framenavigated' commits
      // once enough of the response is available to swap in the new
      // document, which can be well before that same request's OWN body has
      // finished downloading (respondedAt still null). Without this
      // exclusion, a slow-loading document would falsely mark its own
      // driving request as request_abandoned_by_navigation and stop
      // tracking it — it settles normally via requestfinished/requestfailed
      // like any other request; if it never does, pending/stuck detection
      // (not abandonment) is the correct classification for it.
      if (
        entry.frame === frame &&
        entry.respondedAt == null &&
        entry.failure == null &&
        !entry.isNavigationRequest
      ) {
        entry.abandonedByNavigation = true;
      }
    }
  };
  const onConsole = (msg) => {
    if (msg.type() === 'error') page.__actionCollectorConsole.push({ type: 'error', text: redactText(msg.text().slice(0, 300)) });
  };

  page.on('request', onRequest);
  page.on('response', onResponse);
  page.on('requestfinished', onRequestFinished);
  page.on('requestfailed', onRequestFailed);
  page.on('framenavigated', onFrameNavigated);
  page.on('console', onConsole);
  // Keep references so Uninstall (below) can remove exactly these listeners
  // with page.off(event, handler) — never page.removeAllListeners(event),
  // which would also tear down unrelated listeners another part of the
  // session (e.g. video-evidence recording) may have on the same events.
  page.__actionCollectorHandlers = {
    request: onRequest, response: onResponse, requestfinished: onRequestFinished,
    requestfailed: onRequestFailed, framenavigated: onFrameNavigated, console: onConsole,
  };

  page.__actionCollectorInstalled = true;
  return { installed: true, alreadyInstalled: false };
}
```

**Install is idempotent by design, but NOT a no-op** — call it at the start of every flow, not just the session's first. The `if (page.__actionCollectorInstalled)` guard only skips re-attaching listeners and re-creating the request-keyed `WeakMap`; the buffer/console reset above it, and the `__actionCollectorNavRequestSeen` recreation alongside it, each runs on every call, every flow, unconditionally — see "Why 'framenavigated' alone is not enough" for why that `WeakMap` specifically cannot wait for the guard.

**Why 'framenavigated' alone is not enough.** Playwright fires it for same-document navigations (`history.pushState()`, hash changes) exactly as it does for a real navigation to a new document — nothing in the public `page.on('framenavigated', frame => ...)` signature distinguishes the two. Only a real cross-document navigation issues a document-fetching request first (`request.isNavigationRequest()`); a pushState-driven route change issues no request at all. `__actionCollectorNavRequestSeen` tracks, per frame, the *specific* in-flight navigation `Request` objects seen for it since the last `'framenavigated'` processed for that frame — a `Set`, not a bare boolean, because a boolean can't be safely un-set: `onRequestFinished`/`onRequestFailed` remove a request from its frame's set the moment that specific attempt resolves, so a navigation that's cancelled or superseded before ever committing doesn't leave a stale "seen" signal that a later, unrelated same-document navigation on the same frame would inherit. `onFrameNavigated` treats a non-empty set as proof of a real navigation, then clears it either way. Recreating the whole `WeakMap` on every flow-install (not gated behind `alreadyInstalled`) closes the same hole across flow boundaries, not just within one.

**`request.frame()` can throw** — Playwright documents two cases: a request from a Service Worker, and a navigation request issued before its frame exists yet (the second is exactly the kind of request this collector most wants to see coming). `frameOf()` above catches both and returns `null` rather than letting the exception escape the event handler and abort that request's own bookkeeping. A `null` frame simply never matches any real `Frame` in `onFrameNavigated`'s `entry.frame === frame` check, so such a request is correctly never scoped to (and never wrongly abandoned by) any frame's navigation — it can still resolve normally via `requestfinished`/`requestfailed`, or, if it never does, still surface through `pending_request`/`stuck_request` instead.

**The request driving a navigation is never abandoned by that same navigation.** `'framenavigated'` commits once enough of the response is available to swap in the new document — for a slow or streaming document, that request's own `respondedAt` can still be `null` at that exact moment. `entry.isNavigationRequest` (set from `request.isNavigationRequest()`, true for the navigating request itself and for every redirect hop in its chain, each a separate `Request` object) is excluded from `onFrameNavigated`'s abandonment loop for exactly this reason — otherwise a slow document would falsely report itself as `request_abandoned_by_navigation` and stop being tracked, right as it's the one request most worth watching.

### Uninstall (only when a session with `collector_mode: legacy` suspects this exact page/tab may have been left instrumented by an earlier `collector_mode: shadow` session — see "Reusing a page across sessions" below)

```js
async (page) => {
  if (!page.__actionCollectorInstalled) return { uninstalled: false, wasInstalled: false };
  const handlers = page.__actionCollectorHandlers || {};
  for (const eventName of Object.keys(handlers)) {
    page.off(eventName, handlers[eventName]);
  }
  delete page.__actionCollectorHandlers;
  delete page.__actionCollectorRequests;
  delete page.__actionCollectorNavRequestSeen;
  delete page.__actionCollectorBuffer;
  delete page.__actionCollectorConsole;
  delete page.__actionCollectorNextId;
  page.__actionCollectorInstalled = false;
  return { uninstalled: true, wasInstalled: true };
}
```

**Redaction lives in (at least) two places on purpose.** The reducer's `redactUrl` (`action-scoped-collector.mjs`) and this inline `redact` copy must stay logically equivalent — the VM sandbox has no `require`, so this code cannot import the reducer's implementation. `action-scoped-collector.test.mjs` includes a parity test that evaluates this exact snippet's `redact` logic against the same inputs as `redactUrl` and asserts they agree, so drift between the two is caught by the existing test suite rather than only discovered live. `redactText` (console messages) has no reducer-side equivalent to stay in parity with — console text is never re-emitted by the reducer, so redacting it once here, before it is ever buffered or persisted, is the only place it needs to happen.

**Why 'response' and 'requestfinished' are handled separately.** A response can arrive with headers (status known) while its body is still streaming or has stalled — `requestfinished` only fires once the body has actually been fully consumed. Setting `respondedAt` on `'response'` instead of `'requestfinished'` would make a request with a stalled body read as "settled" the moment headers arrived, silently defeating `pending_request`/`stuck_request` detection for exactly the kind of hang this collector exists to catch. Splitting the two also removes a variant of this same bug from an earlier version of this file, which raced `req.response().then(...)` against drain — `'response'`'s `res.status()`/`res.ok()` are available synchronously with no promise chain, and `'requestfinished'` needs no promise at all.

**Reusing a page across sessions.** Install/Uninstall only ever run when a session explicitly calls them via `phases/2-explore.md`'s `collector_mode`-gated instructions — a session with `collector_mode: legacy` never calls Install, so a brand-new page/tab is never instrumented at all. The one case this doesn't cover: an entirely separate, later session reusing the exact same already-open browser page/tab a previous `collector_mode: shadow` session instrumented (this can only happen if whatever is driving the browser — not this skill — persists a page across unrelated sessions; a single session's own resume path re-reads `config.json`, which never changes `collector_mode` mid-session, so this is never a same-session concern). If you have reason to believe that's happening (e.g. you were told to keep reusing an existing tab across separate testing sessions with different areas), run the Uninstall snippet once before Phase 2 even when this session's own `collector_mode` is `legacy` — otherwise the old listeners keep firing and buffering silently for as long as the page lives, with nothing ever draining them.

### Drain (after every checklist step's normal Detector A/B/C run, while `collector_mode: shadow`)

```js
async (page) => {
  const out = [];
  for (const entry of (page.__actionCollectorBuffer || [])) {
    if (entry.__reportedFinal) continue;
    out.push({ id: entry.id, method: entry.method, url: entry.url, status: entry.status, ok: entry.ok,
      failure: entry.failure, requestedAt: entry.requestedAt, respondedAt: entry.respondedAt,
      resourceType: entry.resourceType, abandonedByNavigation: entry.abandonedByNavigation });
    if (entry.respondedAt != null || entry.failure != null || entry.abandonedByNavigation) entry.__reportedFinal = true;
  }
  // Compact now that this drain has reported everything reportable: drop
  // entries already marked __reportedFinal (this drain's or an earlier
  // drain's) so the buffer stays bounded by "currently pending" over a long
  // flow, without ever removing a pending entry drain still needs to see again.
  page.__actionCollectorBuffer = (page.__actionCollectorBuffer || []).filter((e) => !e.__reportedFinal);
  const consoleOut = (page.__actionCollectorConsole || []).splice(0);
  return { network: out, console: consoleOut };
}
```

**Why drain doesn't simply clear the whole buffer:** a request that's still open at drain time (`respondedAt` still `null`) is returned again on the *next* drain if it's still open then — that's exactly how the reducer's cross-action `stuck_request` escalation (see `action-scoped-collector.mjs`) is meant to observe the same signature repeatedly across checklist steps. Only requests that have truly finished (succeeded, failed, or been abandoned by navigation) are marked `__reportedFinal` — `respondedAt`, not `status`, decides this, so a response whose headers arrived but whose body is still streaming is correctly returned again on the next drain instead of being dropped as if it were done. Drain compacts fully-finished entries out of the buffer immediately after reporting them so the buffer's steady-state size tracks "currently open", not "everything ever seen". The `request` handler's own size cap is a defensive backstop only (see comment there) and, unlike a blind `splice`, is only ever allowed to remove entries already marked `__reportedFinal` — it must never discard a still-open entry, since that would silently break `stuck_request` tracking for the rest of the flow.

**`id`** is a per-page, monotonically increasing counter assigned when a request is first seen. The reducer uses it to tell "this signature is still the same request that was pending last checklist step" (→ `stuck_request`) apart from "a settled request and a brand-new request happen to share a URL in the same drain" (→ a plain `pending_request` for the new one, not a false `stuck_request`) — see "Cumulative history" in `action-scoped-collector.mjs`.

## Reducer (Node-side — `action-scoped-collector.mjs`)

```bash
node action-scoped-collector.mjs <drained-events.json> [<prior-state.json>] > result.json
```

Write the drained JSON from the bridge's drain call to a temp file (e.g. `$SESSION_DIR/tmp/collector-events-flow<N>-step<M>.json`), invoke the script, and persist the returned `state` field for the *next* checklist step's invocation in the same flow (`$SESSION_DIR/tmp/collector-state-flow<N>.json`) — omit the prior-state argument for the flow's first checklist step.

## Runtime self-test (automatic — this is what `phases/2-explore.md` actually calls)

Manually re-running `action-scoped-collector-spike.md` before every session isn't realistic, and a stale "verified" flag would be actively misleading. Instead, `phases/2-explore.md` runs the install snippet once at flow start when `collector_mode: shadow`, then treats **any error, missing tool, or malformed response from the first drain call** as a signal to fall back to `collector_mode: legacy` behavior for the rest of that flow — no shadow diffing, no retries, no interruption to the legacy detectors, which were never touched by any of this in the first place. This is a weaker guarantee than the manual spike (it can't prove cross-call persistence the way a deliberate before/after-navigation check can — a page that happens to make zero requests during the first checklist step would still "pass" this weaker check) but it catches the gross failure modes (tool absent, tool errors, response shape wrong) automatically, on every single session, for free.

## What is never collected

- Request or response **bodies** — never requested, never buffered, never returned. Only `id`, `method`, `url` (redacted), `status`, `ok`, `failure`, timestamps, and `resourceType`.
- Credential-shaped query parameter **values** — redacted before the URL ever leaves the bridge (see `redact`/`redactUrl` above). Parameter *names* are preserved so a finding can still say "an auth-related param was present" without revealing it. The redacted placeholder includes a short one-way hash of the original value (`%5BREDACTED:<hash>%5D`, never the value itself) precisely so it stays *distinguishable* — two requests differing only in a sensitive param's value (e.g. `token=a` vs `token=b`) still get different placeholders and are not wrongly merged into one signature by the reducer's method+URL grouping.
- Credential-shaped `key=value` pairs embedded in **console text** — a console error frequently repeats the failing URL verbatim (e.g. "Failed to fetch /api/foo?token=xyz: 500"), so console messages are redacted with the same param names (`redactText`, above) before ever being buffered, not just structured request URLs.
- Anything from a `collector_mode: legacy` session's own page — that session never calls Install. (A page reused from an *earlier, separate* `collector_mode: shadow` session is the one gap this doesn't cover — see "Reusing a page across sessions" above.)
- Anything from a **previous flow** — install resets the buffer/console arrays on every call, so a flow's first drain never returns another flow's leftover events (see "Install" above).

## Known limitation: no click/action intent

`duplicate_api_call` (Level 2) is decided purely from network timing — two identical requests within `DUPLICATE_WINDOW_MS` (500ms) of each other, with no DOM click or action-intent signal to tell a genuine duplicate-call bug apart from, say, a deliberate fast double-click the checklist's "cancel/back-navigate" step is specifically testing for. This is a real limitation, not something this task set out to solve (action-level *timing* boundaries, not click *causation*, were in scope — see the roadmap plan's Task 4). It is **not a regression against what it shadows**: legacy Detector C (`dedup-network.js`) flags *any* 2+ occurrences of the same method+path within a whole action with no time window at all, no query-string distinction, and no spaced-vs-concurrent distinction — this collector's `DUPLICATE_WINDOW_MS` + exact-URL-match + `repeated_api_call` (Level 3) downgrade for spaced-out repeats are already strictly more conservative. Since shadow mode never drives findings (see "Status" above), an over-eager `duplicate_api_call` here only shows up as a reviewable diff entry, not a false report. Capturing genuine click/action intent to disambiguate this further is future work, not blocking for shadow-mode comparison.

## Diff storage and promotion

Diffs land at `$SESSION_DIR/collector-diffs/flow<N>-step<M>.json`: `{ legacy: <Detector A/B/C output for this step>, collector: <reducer output>, onlyInLegacy: [...], onlyInCollector: [...] }`. Per the roadmap plan's completion criteria, promote the collector to replace (not merely supplement) the legacy detectors only after seeded-bug parity across a real regression suite shows no unexplained missed Level 1/2 results — that comparison is future work tracked by the roadmap plan's Task 8, not this task.
