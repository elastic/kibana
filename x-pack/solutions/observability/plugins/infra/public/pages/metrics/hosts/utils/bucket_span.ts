/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shared bucket-size heuristic for ES|QL `BUCKET(@timestamp, <span>)`.
// Targets ~100 buckets across the visible range so the chart density
// matches the inventory model's `interval: 'auto'` behaviour. Used by both
// the Metrics tab grid (P16-A) and the KPI tile trendlines (P15c).
//
// Lives next to `perf_tracker` so anything ES|QL-related on the Hosts UI
// imports its helpers from a single hosts/utils namespace rather than
// reaching across folder boundaries.

const LENS_ESQL_BUCKET_STEPS = [
  { ms: 24 * 60 * 60_000, label: '1d' },
  { ms: 12 * 60 * 60_000, label: '12h' },
  { ms: 6 * 60 * 60_000, label: '6h' },
  { ms: 60 * 60_000, label: '1h' },
  { ms: 30 * 60_000, label: '30m' },
  { ms: 10 * 60_000, label: '10m' },
  { ms: 5 * 60_000, label: '5m' },
  { ms: 60_000, label: '1m' },
] as const;

export const autoBucketSpan = (fromMs: number, toMs: number): string => {
  const rangeMs = Math.max(0, toMs - fromMs);
  const targetMs = Math.max(60_000, Math.round(rangeMs / 100));
  for (const step of LENS_ESQL_BUCKET_STEPS) {
    if (targetMs >= step.ms) return step.label;
  }
  return '1m';
};

// Inverse of `autoBucketSpan` for the values produced above. The
// `WHERE`-aware counter-rate formula in `esql_metrics_chart.ts` divides
// `(MAX - MIN)` by the bucket length in seconds, so it needs the span
// resolved to a number, not the human label that goes into
// `BUCKET(@timestamp, <span>)`. Defined alongside `autoBucketSpan` so
// the two stay in sync when the step table is reshuffled.
export const bucketSpanSeconds = (span: string): number => {
  const step = LENS_ESQL_BUCKET_STEPS.find((s) => s.label === span);
  return step ? step.ms / 1000 : 60;
};
