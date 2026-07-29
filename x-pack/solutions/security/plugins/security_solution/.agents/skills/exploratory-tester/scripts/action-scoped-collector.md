# Action-scoped collector (shadow mode)

**Status: shadow-only, off by default.** This never drives findings. Legacy Detectors A/B/C (`check-dom-anomalies.js`, `classify-console.js`, `dedup-network.js` via the injected bridge from `phases/2-explore.md`) remain the sole source of findings in every session, regardless of `collector_mode`. This collector's entire purpose is to run *alongside* them, record where its classification would have differed, and let a human review those diffs before any promotion decision — see the roadmap plan's completion criterion: "Shadow collector mismatches are measurable, persisted, and reviewed before promotion."

**Before setting `collector_mode: shadow` in any real session, read `action-scoped-collector-spike.md` and run its one-time manual verification.** The runtime self-test below (§ "Runtime self-test") catches gross failures automatically, but it is not a substitute for that manual spike.

## Architecture

```
page.on('request'/'response'/'requestfailed'/'framenavigated'/'console')
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
  if (page.__actionCollectorInstalled) return { installed: true, alreadyInstalled: true };

  page.__actionCollectorBuffer = [];
  page.__actionCollectorConsole = [];
  // WeakMap, not Map: entries are only ever looked up by the Request object
  // itself (never iterated), so once Playwright drops its own reference to an
  // old Request (long after it settles), this entry becomes GC-eligible too
  // instead of growing unboundedly for the life of the page.
  page.__actionCollectorRequests = new WeakMap();

  const SENSITIVE = /^(api[-_]?key|token|password|passwd|secret|auth(orization)?|session|cookie|bearer|access[-_]?token|refresh[-_]?token)$/i;
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
      try { if (SENSITIVE.test(decodeURIComponent(key))) return key + '=%5BREDACTED%5D'; } catch (e) {}
      return pair;
    }).join('&');
    return base + '?' + rest + hash;
  };

  page.on('request', (req) => {
    const entry = {
      method: req.method(), url: redact(req.url()),
      status: null, ok: null, failure: null,
      requestedAt: Date.now(), respondedAt: null,
      resourceType: req.resourceType(), abandonedByNavigation: false,
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
  });
  page.on('response', (res) => {
    const entry = page.__actionCollectorRequests.get(res.request());
    if (!entry) return;
    entry.status = res.status(); entry.ok = res.ok(); entry.respondedAt = Date.now();
  });
  page.on('requestfailed', (req) => {
    const entry = page.__actionCollectorRequests.get(req);
    if (!entry) return;
    entry.failure = (req.failure() && req.failure().errorText) || 'unknown';
    entry.respondedAt = Date.now();
  });
  page.on('framenavigated', (frame) => {
    if (frame !== page.mainFrame()) return;
    for (const entry of page.__actionCollectorBuffer) {
      if (entry.status == null && entry.failure == null) entry.abandonedByNavigation = true;
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') page.__actionCollectorConsole.push({ type: 'error', text: msg.text().slice(0, 300) });
  });

  page.__actionCollectorInstalled = true;
  return { installed: true, alreadyInstalled: false };
}
```

**Idempotent by design** — re-running this (e.g. defensively, at the start of every flow rather than tracking whether it's the first) is always safe: the `if (page.__actionCollectorInstalled)` guard returns immediately without attaching a second set of listeners.

**Redaction lives in two places on purpose.** The reducer's `redactUrl` (`action-scoped-collector.mjs`) and this inline copy must stay logically equivalent — the VM sandbox has no `require`, so this code cannot import the reducer's implementation. `action-scoped-collector.test.mjs` includes a parity test that evaluates this exact snippet's `redact` logic against the same inputs as `redactUrl` and asserts they agree, so drift between the two is caught by the existing test suite rather than only discovered live.

### Drain (after every checklist step's normal Detector A/B/C run, while `collector_mode: shadow`)

```js
async (page) => {
  const out = [];
  for (const entry of (page.__actionCollectorBuffer || [])) {
    if (entry.__reportedFinal) continue;
    out.push({ method: entry.method, url: entry.url, status: entry.status, ok: entry.ok,
      failure: entry.failure, requestedAt: entry.requestedAt, respondedAt: entry.respondedAt,
      resourceType: entry.resourceType, abandonedByNavigation: entry.abandonedByNavigation });
    if (entry.status != null || entry.failure != null || entry.abandonedByNavigation) entry.__reportedFinal = true;
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

**Why drain doesn't simply clear the whole buffer:** a request that's still pending at drain time (no `status`/`failure` yet) is returned again on the *next* drain if it's still pending then — that's exactly how the reducer's cross-action `stuck_request` escalation (see `action-scoped-collector.mjs`) is meant to observe the same signature repeatedly across checklist steps. Only requests that have fully settled (succeeded, failed, or been abandoned by navigation) are marked `__reportedFinal`, and drain compacts those out of the buffer immediately after reporting them so the buffer's steady-state size tracks "currently pending", not "everything ever seen". The `request` handler's own size cap is a defensive backstop only (see comment there) and, unlike a blind `splice`, is only ever allowed to remove entries already marked `__reportedFinal` — it must never discard a still-pending entry, since that would silently break `stuck_request` tracking for the rest of the flow.

## Reducer (Node-side — `action-scoped-collector.mjs`)

```bash
node action-scoped-collector.mjs <drained-events.json> [<prior-state.json>] > result.json
```

Write the drained JSON from the bridge's drain call to a temp file (e.g. `$SESSION_DIR/tmp/collector-events-flow<N>-step<M>.json`), invoke the script, and persist the returned `state` field for the *next* checklist step's invocation in the same flow (`$SESSION_DIR/tmp/collector-state-flow<N>.json`) — omit the prior-state argument for the flow's first checklist step.

## Runtime self-test (automatic — this is what `phases/2-explore.md` actually calls)

Manually re-running `action-scoped-collector-spike.md` before every session isn't realistic, and a stale "verified" flag would be actively misleading. Instead, `phases/2-explore.md` runs the install snippet once at flow start when `collector_mode: shadow`, then treats **any error, missing tool, or malformed response from the first drain call** as a signal to fall back to `collector_mode: legacy` behavior for the rest of that flow — no shadow diffing, no retries, no interruption to the legacy detectors, which were never touched by any of this in the first place. This is a weaker guarantee than the manual spike (it can't prove cross-call persistence the way a deliberate before/after-navigation check can — a page that happens to make zero requests during the first checklist step would still "pass" this weaker check) but it catches the gross failure modes (tool absent, tool errors, response shape wrong) automatically, on every single session, for free.

## What is never collected

- Request or response **bodies** — never requested, never buffered, never returned. Only `method`, `url` (redacted), `status`, `ok`, `failure`, timestamps, and `resourceType`.
- Credential-shaped query parameter **values** — redacted before the URL ever leaves the bridge (see `redact`/`redactUrl` above). Parameter *names* are preserved so a finding can still say "an auth-related param was present" without revealing it.
- Anything from `collector_mode: legacy` sessions — the bridge is never installed at all unless `collector_mode: shadow` is explicitly set.

## Diff storage and promotion

Diffs land at `$SESSION_DIR/collector-diffs/flow<N>-step<M>.json`: `{ legacy: <Detector A/B/C output for this step>, collector: <reducer output>, onlyInLegacy: [...], onlyInCollector: [...] }`. Per the roadmap plan's completion criteria, promote the collector to replace (not merely supplement) the legacy detectors only after seeded-bug parity across a real regression suite shows no unexplained missed Level 1/2 results — that comparison is future work tracked by the roadmap plan's Task 8, not this task.
