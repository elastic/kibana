/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Moment } from 'moment';

const MIN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const HOUR_MS = MIN_INTERVAL_MS;
const DAY_MS = 24 * HOUR_MS;
const CHAT_TARGET_BUCKETS = 100 as const;

/**
 * Bucket-size options for the chat heuristic, ordered from larger buckets
 * (fewer chart points) to smaller buckets (more points): month → week → day → … → hour.
 */
const CHAT_INTERVAL_CANDIDATES: ReadonlyArray<{
  value: number;
  unit: string;
  ms: number;
}> = [
  { value: 1, unit: 'M', ms: 30 * DAY_MS },
  { value: 1, unit: 'w', ms: 7 * DAY_MS },
  { value: 1, unit: 'd', ms: DAY_MS },
  { value: 12, unit: 'h', ms: 12 * HOUR_MS },
  { value: 6, unit: 'h', ms: 6 * HOUR_MS },
  { value: 3, unit: 'h', ms: 3 * HOUR_MS },
  { value: 1, unit: 'h', ms: HOUR_MS },
];

/**
 * Simple auto-interval for Agent Builder chat snapshots — no uiSettings /
 * TimeBuckets. Prefer the smallest nice bucket that still stays within
 * {@link CHAT_TARGET_BUCKETS} points; never smaller than 1h.
 */
export const resolveSimpleRiskScoreHistoryInterval = ({
  min,
  max,
}: {
  min: Moment;
  max: Moment;
}) => {
  const rangeMs = Math.max(max.valueOf() - min.valueOf(), 0);
  if (rangeMs <= MIN_INTERVAL_MS) {
    return { value: 1, unit: 'h' };
  }

  // List is larger buckets → smaller; findLast = smallest bucket that still
  // keeps rangeMs / bucketMs ≤ CHAT_TARGET_BUCKETS.
  const selected =
    CHAT_INTERVAL_CANDIDATES.findLast(
      (candidate) => rangeMs / candidate.ms <= CHAT_TARGET_BUCKETS
    ) ?? CHAT_INTERVAL_CANDIDATES[0];

  return { value: selected.value, unit: selected.unit };
};
