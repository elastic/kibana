/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PoC-only — module-level singleton that captures wall-time samples for each
// Hosts-UI endpoint so the gear popover can render an in-page A/B table
// without round-tripping through EBT / DevTools.
//
// Why not React state: every fetcher records its timing on resolve, which
// happens dozens of times per session as the user paginates / sorts. Routing
// that through context + reducer would re-render the entire HostsView tree
// on every record. We keep the data in a module singleton, dev-mode-log to
// the console for free-of-cost observability, and expose a
// `useSyncExternalStore`-compatible subscription so only the overlay panel
// re-renders.
//
// Why the snapshot is a fresh `Map` on every write: `useSyncExternalStore`
// requires identity-stable snapshots between calls when nothing changed,
// and a fresh identity when something did. Replacing the Map ensures both.

export interface PerfEntry {
  duration: number;
  timestamp: number;
  meta?: Record<string, unknown>;
}

export type PerfSnapshot = ReadonlyMap<string, ReadonlyArray<PerfEntry>>;

const MAX_ENTRIES_PER_KEY = 10;

type Listener = () => void;

class PerfTracker {
  // Use a `ReadonlyMap` alias to make the "treat as immutable" intent
  // visible at the read sites — the actual write path always allocates a
  // new `Map` so callers can rely on referential equality.
  private snapshot: PerfSnapshot = new Map();
  private listeners = new Set<Listener>();

  record(key: string, duration: number, meta?: Record<string, unknown>) {
    const next = new Map(this.snapshot);
    const previous = next.get(key) ?? [];
    const entry: PerfEntry = { duration, timestamp: Date.now(), meta };
    next.set(key, [entry, ...previous].slice(0, MAX_ENTRIES_PER_KEY));
    this.snapshot = next;

    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info(
        `[hosts-perf] ${key}: ${duration.toFixed(0)}ms`,
        meta && Object.keys(meta).length ? meta : ''
      );
    }

    this.notify();
  }

  clear() {
    this.snapshot = new Map();
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('[hosts-perf] cleared');
    }
    this.notify();
  }

  getSnapshot(): PerfSnapshot {
    return this.snapshot;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const perfTracker = new PerfTracker();

// Centralised keys so consumers don't drift on string literals. The keys
// double as the labels rendered in the gear-popover overlay; keep them
// short and reviewer-readable.
export const PERF_KEYS = {
  // P16-A — each Lens ES|QL chart records one sample on `onLoad(false)`.
  // We keep all eleven under a single key (the `meta.metric` tag identifies
  // which tile produced the sample) so the overlay shows the rolling
  // distribution rather than one row per chart. `MAX_ENTRIES_PER_KEY=10`
  // means the most recent ~one render cycle survives, which is what
  // reviewers want to see when comparing against the legacy Lens DSL path.
  lensEsqlChart: 'Metrics tab — Lens ES|QL (per chart)',
  // P15c — KPI tiles. One sample per render cycle per tile (Lens fires
  // `onLoad(false)` once the single text-based layer finishes). The
  // trendline isn't supported on the ES|QL path (see
  // `esql_kpi_chart.ts`), so there's no second layer to disambiguate.
  // Same `MAX_ENTRIES_PER_KEY=10` ceiling as `lensEsqlChart`.
  lensEsqlKpi: 'KPI tiles — Lens ES|QL (per tile)',
  // P15b — KPI strip rendered through the server endpoint
  // (`POST /api/metrics/infra/host/kpis`) instead of any Lens embeddable.
  // One sample per fetch (the four tiles share the same request), so the
  // overlay shows a single wall-time per KPI cycle to A/B against the
  // four per-tile samples from the Lens DSL / Lens ES|QL paths.
  esqlEndpointKpi: 'KPI strip — server endpoint (ES|QL, per fetch)',
} as const;

export type PerfKey = (typeof PERF_KEYS)[keyof typeof PERF_KEYS];

// Tiny convenience wrapper so call sites stay a one-liner. Captures the
// duration and forwards it to the tracker; the closure is generic over the
// resolved type so the caller still gets full type-narrowing on the
// awaited value.
export async function recordPerf<T>(
  key: PerfKey,
  meta: Record<string, unknown> | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    perfTracker.record(key, performance.now() - start, meta);
  }
}

// Benchmark journey helpers — emit User Timing marks/measures that a
// Playwright runner can read via `performance.getEntriesByType('measure')`.
// `markOnce` is critical: hooks re-render on every state change and Lens
// tiles can fire `onLoad` multiple times; we only want one mark per mount.

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
