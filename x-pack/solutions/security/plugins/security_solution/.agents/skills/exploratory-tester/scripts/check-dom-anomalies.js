/**
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
}
