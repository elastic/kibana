/**
 * Detector injection wrapper for exploratory testing.
 *
 * GENERATED FILE — do not edit directly.
 * Source: check-dom-anomalies.js, classify-console.js, dedup-network.js
 * Regenerate: node scripts/__tests__/build-injector.mjs
 * Verify:     node scripts/__tests__/equivalence.test.mjs
 *
 * Usage: pass as the `function` argument to browser_evaluate ONCE at flow start,
 * and again after every browser_navigate (navigation resets the window context):
 *
 *   browser_evaluate(function: "<paste full file content>")
 *
 * Per-step detector calls are then:
 *   browser_evaluate(function: "() => window.__et.dom()")
 *   browser_evaluate(function: "() => window.__et.console(["msg1","msg2"])")
 *   browser_evaluate(function: "() => window.__et.network([{"method":"GET","url":"https://..."}])")
 *
 * Fallback: if browser_evaluate fails or window.__et is undefined after injection,
 * fall back to the original paste procedure (paste full script content each time).
 *
 * Token savings vs paste: ~129 KB/flow → ~9 KB/flow (93% reduction in detector payload).
 */
(() => {
  window.__et = {

    // ── Detector A: DOM anomalies ─────────────────────────────────────────
    // source: scripts/check-dom-anomalies.js
    dom: /**
 * DOM anomaly detector for exploratory testing.
 *
 * Usage — pass as the `function` argument to browser_evaluate:
 *   browser_evaluate(function: "<paste full file content>")
 *
 * Returns: { level1: Item[], level2: Item[], level3: Item[] }
 *   Item: { type: string, text: string, count?: number }
 *
 * The agent logs each returned item as a finding at the indicated level.
 * No interpretation needed — results are deterministic.
 */
() => {
  const r = { level1: [], level2: [], level3: [] };

  // ── Level 1: error toasts ────────────────────────────────────────────────
  document.querySelectorAll(
    '[class*="euiToast--danger"], [data-test-subj*="toastErrorMessage"]'
  ).forEach(el =>
    r.level1.push({ type: 'error_toast', text: el.textContent.trim().substring(0, 300) })
  );

  // ── Level 1: full-page error (Kibana 500 / fatal error page) ────────────
  if (
    document.querySelector('[data-test-subj="errorPage"], [data-test-subj="kibanaFatalError"]') ||
    document.title.toLowerCase().startsWith('error')
  ) {
    r.level1.push({ type: 'error_page', text: document.title });
  }

  // ── Level 1: global danger banner ───────────────────────────────────────
  document.querySelectorAll(
    '[data-test-subj="globalBannerList"] [class*="danger"]'
  ).forEach(el =>
    r.level1.push({ type: 'error_banner', text: el.textContent.trim().substring(0, 300) })
  );

  // ── Level 2: embeddable panel errors ────────────────────────────────────
  const embeddableErrors = document.querySelectorAll('[data-embeddable-error]');
  if (embeddableErrors.length > 0)
    r.level2.push({ type: 'embeddable_error', count: embeddableErrors.length,
      text: Array.from(embeddableErrors).map(e => e.textContent.trim().substring(0, 100)).join(' | ') });

  // ── Level 2: EUI callout danger (inline error state) ────────────────────
  document.querySelectorAll('[class*="euiCallOut--danger"]').forEach(el =>
    r.level2.push({ type: 'error_callout', text: el.textContent.trim().substring(0, 300) })
  );

  // ── Level 2: panels that failed to render ───────────────────────────────
  const notRendered = document.querySelectorAll('[data-render-complete="false"]');
  if (notRendered.length > 0)
    r.level2.push({ type: 'panels_not_rendered', count: notRendered.length,
      text: `${notRendered.length} panel(s) have data-render-complete="false"` });

  // ── Level 2: search-response warning badge (CCS / partial results) ───────
  // Icon-only badge — visible text/title is just a count ("N warnings").
  // The actual "Problem with N cluster(s)" message only renders inside the
  // popover after a click, so a plain innerText search misses it entirely.
  document.querySelectorAll(
    '[data-test-subj="searchResponseWarningsBadgeToogleButton"]'
  ).forEach(el =>
    r.level2.push({ type: 'search_response_warning_badge',
      text: 'Search response warning badge present (' + el.textContent.trim() + ') — click it to read the full message before concluding no warning exists' })
  );

  // ── Level 2: search-response warning callout (already has visible text) ──
  document.querySelectorAll('[data-test-subj="searchResponseWarningsCallout"]').forEach(el =>
    r.level2.push({ type: 'search_response_warning_callout', text: el.textContent.trim().substring(0, 300) })
  );

  // ── Level 3: loading spinners still visible ──────────────────────────────
  // (only meaningful if called after waiting for the action to settle)
  const spinners = document.querySelectorAll(
    '[data-test-subj*="loading"]:not([hidden]), [class*="euiLoadingSpinner"]:not([hidden])'
  );
  if (spinners.length > 0)
    r.level3.push({ type: 'spinner_present', count: spinners.length,
      text: `${spinners.length} spinner(s) still visible` });

  return r;
},

    // ── Detector B: console classifier ───────────────────────────────────
    // source: scripts/classify-console.js (inner function extracted from IIFE)
    console: (messages) => {
  const r = { level1: [], level2: [], level3: [], suppressed: [] };

  const SUPPRESS = [
    'Executing inline script violates the following Content Security Policy',
    '/internal/cloud/solution',
    '/internal/osquery/',
  ];

  messages.forEach(msg => {
    // ── Suppressed noise ────────────────────────────────────────────────────
    if (SUPPRESS.some(p => msg.includes(p))) {
      r.suppressed.push({ type: 'noise', text: msg.substring(0, 200) });
      return;
    }

    // ── Level 1: infinite React re-render ───────────────────────────────────
    if (msg.includes('Maximum update depth exceeded')) {
      r.level1.push({ type: 'infinite_rerender', text: msg.substring(0, 200) });
      return;
    }

    // ── Level 1: server error (5xx) ─────────────────────────────────────────
    // ── Level 1: server error (5xx) ────────────────────────────────────────────────
    if (/\b50[0-9]\b/.test(msg)) {
      r.level1.push({ type: 'server_error', text: msg.substring(0, 200) });
      return;
    }

    // ── Level 2: React warning ───────────────────────────────────────────────
    if (msg.startsWith('Warning:')) {
      r.level2.push({ type: 'react_warning', text: msg.substring(0, 200) });
      return;
    }

    // ── Level 3: everything else ─────────────────────────────────────────────
    r.level3.push({ type: 'console_error', text: msg.substring(0, 200) });
  });

  return r;
},

    // ── Detector C: network duplicate detector ────────────────────────────
    // source: scripts/dedup-network.js (inner function extracted from IIFE)
    network: (requests) => {
  const POLLING = ['/health', '/status', '/metrics', '/fleet-setup', '/api/security/me'];

  const counts = {};
  requests.forEach(r => {
    const key = r.method + ' ' + r.url.split('?')[0];
    counts[key] = (counts[key] || 0) + 1;
  });

  const findings = [];
  Object.entries(counts).forEach(([key, n]) => {
    if (n >= 2 && !POLLING.some(p => key.includes(p))) {
      findings.push({
        type: 'duplicate_api_call',
        key,
        count: n,
        text: `Duplicate API call: ${key} called ${n} times`,
      });
    }
  });

  return { findings };
},

  };
})()
