/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaselineObservation } from '@kbn/significant-events-schema';
import { canCompileMatchMetric } from '../lib/significant_events/rules/can_compile_match_metric';
import type { StoredQueryRunner } from './run_probe';

// Same statistic as the detection-engine prototype: median plus a MAD band, with a floor so a flat
// history does not flag noise.
const BUCKET_MINUTES = 5;
const HISTORY_BUCKETS = 60;
const MIN_SAMPLES = 10;
const MAD_BAND = 3 * 1.4826;
const MIN_DELTA = 3;

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
};

export const checkBaseline = ({
  value,
  history,
}: {
  value: number;
  history: readonly number[];
}): BaselineObservation => {
  if (history.length < MIN_SAMPLES) {
    return { decision: 'warming_up', value, samples: history.length };
  }
  const center = median(history);
  const mad = median(history.map((sample) => Math.abs(sample - center)));
  const threshold = center + Math.max(MAD_BAND * mad, MIN_DELTA);
  return {
    decision: value > threshold ? 'above_normal' : 'background',
    value,
    samples: history.length,
    median: center,
    threshold,
  };
};

/**
 * Observes a filter-only match query: its count per five-minute bucket over the last hour of
 * complete buckets, against the latest complete one. Anything else (aggregating queries, missing
 * query, a failed run) yields no observation.
 */
export const observeMatchSeries = async ({
  query,
  now,
  run,
}: {
  query: string | undefined;
  now: number;
  run: StoredQueryRunner;
}): Promise<BaselineObservation | undefined> => {
  if (!query || !canCompileMatchMetric(query)) return undefined;

  const bucketMs = BUCKET_MINUTES * 60_000;
  const currentStart = Math.floor(now / bucketMs) * bucketMs - bucketMs;
  const firstStart = currentStart - HISTORY_BUCKETS * bucketMs;
  const { status, values } = await run({
    query,
    tail: `STATS c = COUNT(*) BY b = BUCKET(@timestamp, ${BUCKET_MINUTES} minute) | KEEP b, c`,
    window: {
      from: new Date(firstStart).toISOString(),
      to: new Date(currentStart + bucketMs).toISOString(),
    },
  });
  if (status !== 'ok') return undefined;

  // ES|QL returns no row for a bucket without matches, so absent buckets are zeros.
  const counts = new Map(
    values.map(([bucket, count]) => [Date.parse(String(bucket)), Number(count)])
  );
  return checkBaseline({
    value: counts.get(currentStart) ?? 0,
    history: Array.from(
      { length: HISTORY_BUCKETS },
      (_, i) => counts.get(firstStart + i * bucketMs) ?? 0
    ),
  });
};
