/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// User Timing marks/measures for the Hosts page first-paint subsystems. A
// Playwright performance journey (`x-pack/performance/journeys_e2e/
// infra_hosts_view_kpi.ts`) reads these via
// `performance.getEntriesByType('measure')` to regression-gate the KPI
// render path.
//
// `markOnce` is critical: the page hooks re-render on every state change, so
// we only want one mark per page mount. The marks are namespaced under
// `infra.hosts.*`:
//
//   - `navigationStart`        — set on `HostsPage` mount.
//   - `hostCountReadyDuration` — `/api/infra/host/count` resolved.
//   - `tableReadyDuration`     — `/api/metrics/infra/host` resolved.
//   - `kpiReadyDuration`       — client-side ES|QL KPI query resolved.

export function markOnce(name: string): void {
  if (typeof performance === 'undefined' || typeof performance.mark !== 'function') {
    return;
  }

  try {
    if (performance.getEntriesByName(name, 'mark').length > 0) {
      return;
    }
    performance.mark(name);
  } catch {
    // User Timing can throw on duplicate names in some browsers.
  }
}

export function measureSince(measureName: string, startMark: string): void {
  if (typeof performance === 'undefined' || typeof performance.measure !== 'function') {
    return;
  }

  try {
    if (performance.getEntriesByName(startMark, 'mark').length === 0) {
      return;
    }
    performance.measure(measureName, startMark);
  } catch {
    // Missing/invalid marks or duplicate measure names.
  }
}
