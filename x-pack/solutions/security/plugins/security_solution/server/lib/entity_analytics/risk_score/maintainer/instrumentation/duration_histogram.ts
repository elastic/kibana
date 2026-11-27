/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const BUCKET_COUNT = 256;
const BUCKETS_PER_DOUBLING = 8;

/** Retains approximate duration percentiles in fixed storage with eight buckets per doubling. */
export const createDurationHistogram = () => {
  const buckets = new Float64Array(BUCKET_COUNT);
  let calls = 0;
  let maxMs = 0;
  return {
    record: (ms: number) => {
      const index = Math.ceil(Math.log2(ms + 1) * BUCKETS_PER_DOUBLING);
      buckets[Math.min(BUCKET_COUNT - 1, Math.max(0, index))] += 1;
      calls += 1;
      maxMs = Math.max(maxMs, ms);
    },
    percentile: (fraction: number) => percentile(buckets, calls, maxMs, fraction),
  };
};

/** Estimates a percentile using its bucket's upper duration boundary, capped by the observed maximum. */
const percentile = (
  buckets: Float64Array,
  calls: number,
  maxMs: number,
  fraction: number
): number => {
  const rank = Math.ceil(calls * fraction);
  let count = 0;
  for (let index = 0; index < buckets.length; index++) {
    count += buckets[index];
    if (count >= rank) {
      // Invert log2(ms + 1) * BUCKETS_PER_DOUBLING to recover the upper boundary in milliseconds.
      return Math.round(Math.min(maxMs, 2 ** (index / BUCKETS_PER_DOUBLING) - 1));
    }
  }
  return Math.round(maxMs);
};
