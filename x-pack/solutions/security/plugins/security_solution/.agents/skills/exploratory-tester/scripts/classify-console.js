/**
 * Console message classifier for exploratory testing.
 *
 * Usage:
 *   1. Call browser_console_messages(level: "error") — collect message texts.
 *   2. Call browser_evaluate with this file's content, replacing /*MESSAGES* /
 *      with a JSON array of the message strings:
 *
 *        browser_evaluate(function: "<file content with /*MESSAGES* / replaced>")
 *
 *      Example substitution:
 *        Replace:  )(/*MESSAGES*\/)
 *        With:     )(["Warning: missing key", "500 @ /api/foo"])
 *
 * Returns: { level1: Item[], level2: Item[], level3: Item[], suppressed: Item[] }
 *   Item: { type: string, text: string }
 *
 * Log level1[] as Level 1 findings, level2[] as Level 2, level3[] as Level 3.
 * suppressed[] items are known noise — do not log them.
 */
((messages) => {
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
})(/*MESSAGES*/)
