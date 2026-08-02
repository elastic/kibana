/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndActivityBucket, PndActivityCounts } from '@kbn/pnd-common';

import { resolveActivityAction } from '../resolve_activity_action';
import {
  PND_ACTIVITY_BUCKET_COUNT,
  PND_ACTIVITY_BUCKET_MS,
  resolveActivityWindow,
} from '../resolve_activity_window';

/** One `stepId` term of an hour's sub-aggregation. */
export interface PndActivityStepIdBucket {
  doc_count: number;
  key: string;
}

/** One hour of the `date_histogram`, keyed on epoch milliseconds. */
export interface PndActivityHistogramBucket {
  by_step_id?: { buckets: PndActivityStepIdBucket[] };
  doc_count: number;
  key: number;
}

export interface BuildActivityBucketsParams {
  /** The `by_hour` buckets Elasticsearch returned, in any order and of any length. */
  buckets: PndActivityHistogramBucket[];
  /** Epoch milliseconds the series is anchored on; the same value the query was built with. */
  now: number;
}

/**
 * Every action at zero. Written out rather than folded from `RECOMMENDED_ACTIONS` so the compiler
 * checks it against the contract: a fifth action would fail the type check here instead of
 * shipping a bucket missing a key.
 */
const ZERO_COUNTS: PndActivityCounts = { contain: 0, escalate: 0, investigate: 0, tune: 0 };

const toCounts = (buckets: PndActivityStepIdBucket[]): PndActivityCounts =>
  buckets.reduce<PndActivityCounts>((counts, { doc_count: docCount, key }) => {
    const action = resolveActivityAction(key);

    return action == null ? counts : { ...counts, [action]: counts[action] + docCount };
  }, ZERO_COUNTS);

/**
 * Normalise the `date_histogram` into exactly {@link PND_ACTIVITY_BUCKET_COUNT} buckets, oldest
 * first, with every recommended action present on every one of them.
 *
 * The series is built from the window rather than from what Elasticsearch returned, which is what
 * makes all three response-contract guarantees hold unconditionally:
 *
 * - **Exactly 24.** `extended_bounds` over a `now-24h` range routinely emits a 25th partial
 *   bucket, which would fail the contract's `max(24)` bound and 500 the route.
 * - **Oldest first.** The chart's x axis is time-scaled and reads left to right.
 * - **Zero-filled.** A quiet hour must be a `0`, never an absent key: a gap in the series renders
 *   as a data outage rather than as an hour in which nothing happened.
 */
export const buildActivityBuckets = ({
  buckets,
  now,
}: BuildActivityBucketsParams): PndActivityBucket[] => {
  const { start } = resolveActivityWindow(now);
  const countsByTime = new Map<number, PndActivityCounts>(
    buckets.map(({ by_step_id: byStepId, key }): [number, PndActivityCounts] => [
      key,
      toCounts(byStepId?.buckets ?? []),
    ])
  );

  return Array.from({ length: PND_ACTIVITY_BUCKET_COUNT }, (_, index): PndActivityBucket => {
    const time = start + index * PND_ACTIVITY_BUCKET_MS;

    return { counts: countsByTime.get(time) ?? ZERO_COUNTS, time };
  });
};
