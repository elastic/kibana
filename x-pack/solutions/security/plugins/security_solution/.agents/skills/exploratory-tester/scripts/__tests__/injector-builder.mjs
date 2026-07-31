/**
 * Pure generation logic for scripts/inject-detectors.js.
 *
 * Shared by build-injector.mjs (the CLI that writes the generated file) and
 * equivalence.test.mjs (which asserts the committed file has zero drift from
 * what this logic would produce right now). Keeping this in one place is the
 * only way both callers can guarantee they agree — duplicating the extraction
 * logic invites exactly the drift this module exists to catch.
 */

// classify-console.js: ((messages) => { body })(/*MESSAGES*/)
//   → extract: (messages) => { body }
// dedup-network.js: ((requests) => { body })(/*REQUESTS*/)
//   → extract: (requests) => { body }
export function extractInner(script, iifeMark, placeholder) {
  const iifeStart = script.indexOf(iifeMark);
  const markerIdx = script.lastIndexOf(`)(${placeholder})`);
  if (iifeStart === -1 || markerIdx === -1) {
    throw new Error(`Could not find IIFE pattern '${iifeMark}' or placeholder '${placeholder}'`);
  }
  return script.slice(iifeStart + 1, markerIdx);
}

/**
 * @param {{ domScript: string, consoleScript: string, networkScript: string }} sources
 *   Trimmed contents of check-dom-anomalies.js, classify-console.js, and
 *   dedup-network.js respectively.
 * @returns {string} the exact bytes that belong in scripts/inject-detectors.js
 */
export function buildInjectorSource({ domScript, consoleScript, networkScript }) {
  const consoleFn = extractInner(consoleScript, '((messages)', '/*MESSAGES*/');
  const networkFn = extractInner(networkScript, '((requests)', '/*REQUESTS*/');

  // domScript is already a self-contained arrow function: () => { ... }

  return `/**
 * Detector injection wrapper for exploratory testing.
 *
 * GENERATED FILE — do not edit directly.
 * Source: check-dom-anomalies.js, classify-console.js, dedup-network.js
 * Regenerate: node scripts/__tests__/build-injector.mjs
 * Verify:     node scripts/__tests__/equivalence.test.mjs
 *
 * Usage: pass as the \`function\` argument to browser_evaluate ONCE per flow,
 * and again after every browser_navigate (navigation resets the window context):
 *
 *   browser_evaluate(function: "<paste full file content>")
 *
 * Per-step detector calls are then (illustrative — real args are JSON, quoted with "):
 *   browser_evaluate(function: "() => window.__et.dom()")
 *   browser_evaluate(function: "() => window.__et.console(['msg1', 'msg2'])")
 *   browser_evaluate(function: "() => window.__et.network([{method: 'GET', url: 'https://...'}])")
 *
 * Fallback: if browser_evaluate fails or window.__et is undefined after injection,
 * fall back to the original paste procedure (paste full script content each time).
 *
 * Cost model: a flow with V browser_navigate calls injects V+1 times
 * (~7 KB each) instead of pasting all three detector scripts (~113 KB total)
 * at every one of its checklist steps. The fewer navigations per flow, the
 * closer the savings get to the ~93% reduction seen with a single injection;
 * a flow that navigates on every step sees a much smaller reduction, since
 * the per-navigation reinjection cost then dominates.
 */
(() => {
  window.__et = {

    // ── Detector A: DOM anomalies ─────────────────────────────────────────
    // source: scripts/check-dom-anomalies.js
    dom: ${domScript},

    // ── Detector B: console classifier ───────────────────────────────────
    // source: scripts/classify-console.js (inner function extracted from IIFE)
    console: ${consoleFn},

    // ── Detector C: network duplicate detector ────────────────────────────
    // source: scripts/dedup-network.js (inner function extracted from IIFE)
    network: ${networkFn},

  };
})()
`;
}
