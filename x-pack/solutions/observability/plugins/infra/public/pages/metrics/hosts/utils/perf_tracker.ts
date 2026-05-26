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
  phaseA: 'Phase A — /host/list',
  phaseB: 'Phase B — /host/metrics',
  legacy: 'Legacy — /host (single)',
  kpis: 'KPIs — /host/kpis',
  metricsTimeseries: 'Metrics tab — /host/metrics_timeseries',
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
