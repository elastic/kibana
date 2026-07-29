# Action-scoped collector — capability spike (run once per MCP setup)

**Status: unverified against a live browser as of this writing.** The design in `action-scoped-collector.md` rests on one assumption: that `browser_run_code_unsafe`'s `page` argument is the session's persistent Playwright Page object, so a listener installed in one call and buffering onto a property of `page` itself is still there — and still accumulating — in a later, separate `browser_run_code_unsafe` call, even across an intervening `browser_navigate`.

**Do not set `collector_mode: shadow` in any real session until this procedure has been run once against your actual MCP setup and produced a PASS.** `collector_mode: legacy` (the default) never depends on any of this and is unaffected either way.

## Why we believe this works, before testing it

Microsoft's own `playwright-core` source for this tool ([`packages/playwright-core/src/tools/backend/runCode.ts`](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/tools/backend/runCode.ts)) passes `page: tab.page` into the sandboxed VM context — `tab.page` is the tab's live, long-lived Page object, not a fresh throwaway one. Since JS objects are passed by reference, mutating a property on `page` (e.g. pushing onto an array) mutates the real object, and Playwright page-level listeners (`page.on('response', ...)`, `page.on('request', ...)`) are documented to survive same-page navigations. This is strong source-level evidence, but it has not been exercised against a real browser/MCP transport in this repository — hence this spike.

## Procedure

Run these steps in order, in a session with a working Playwright MCP server attached (any page works — this does not need to be Kibana).

**1. Navigate to any page** via the normal `browser_navigate` tool, e.g. `https://example.com`.

**2. Install a listener**, via `browser_run_code_unsafe`:

```js
async (page) => {
  page.__spikeBuffer = page.__spikeBuffer || [];
  if (!page.__spikeListenerInstalled) {
    page.on('response', (res) => {
      page.__spikeBuffer.push({ method: res.request().method(), url: res.url(), status: res.status(), ts: Date.now() });
    });
    page.__spikeListenerInstalled = true;
  }
  return { installed: true, bufferLengthAtInstall: page.__spikeBuffer.length };
}
```

Expect `{ installed: true, bufferLengthAtInstall: 0 }`.

**3. Navigate again**, via the normal `browser_navigate` tool (not `run_code`), to a page that fires several requests, e.g. `https://www.wikipedia.org`.

**4. Read back the buffer**, in a separate `browser_run_code_unsafe` call:

```js
async (page) => {
  return {
    listenerStillInstalled: !!page.__spikeListenerInstalled,
    bufferLength: (page.__spikeBuffer || []).length,
    sample: (page.__spikeBuffer || []).slice(-5),
  };
}
```

**5. Re-run step 2's exact code once more** (simulating the "reinject once per flow" idempotency check the bridge relies on) and confirm `bufferLengthAtInstall` now equals step 4's `bufferLength` (not `0`) and no second listener was double-registered (buffer growth rate after this should match growth rate before it — sanity-check with one more small navigation if unsure).

## Decision rule

| Result | Meaning |
|---|---|
| Step 4's `bufferLength > 0`, and `sample` URLs are from the Wikipedia navigation in step 3 | **PASS.** Listeners persist across separate tool calls and across navigation. The bridge design in `action-scoped-collector.md` is viable as designed. |
| Step 4's `bufferLength === 0` or `listenerStillInstalled === false` | **FAIL.** The assumption does not hold for this MCP server/version. Do not enable `collector_mode: shadow`. File a note in the session's `config.json` and stop — this needs a design change (e.g. a different persistence mechanism, or dropping the collector back to a spike/future-work item), not a workaround bolted onto the bridge. |
| `browser_run_code_unsafe` is not available at all | **FAIL — not applicable.** The whole collector is inert without this tool; `collector_mode` should stay `legacy`. This is exactly why `action-scoped-collector.md`'s runtime self-test treats a missing/erroring tool as an automatic, silent fallback to legacy-only behavior for that session — no manual intervention required in that specific case. |

## Recording the result

This file intentionally has no machine-readable "verified: true" flag to flip — a stale flag is worse than no flag, because nothing enforces that it still matches the MCP server version actually in use. Instead:

- Run the spike once against your own setup before you personally rely on `collector_mode: shadow`.
- The bridge's own runtime self-test (see `action-scoped-collector.md` → "Runtime self-test") re-verifies the load-bearing part of this automatically at the start of every shadow-mode flow and safely no-ops back to legacy-only if it fails — so a stale or skipped manual spike degrades gracefully rather than silently producing wrong data.
- If you want a durable record for your own tracking, note the date, Playwright/MCP version, and PASS/FAIL in your own scratch notes or the session's `config.json` — this is optional and not read by any script here.
