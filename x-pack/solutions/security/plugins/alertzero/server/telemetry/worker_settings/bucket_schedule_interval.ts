/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertZeroScheduleIntervalBucket } from '../constants';

const MINUTES_PER_UNIT: Readonly<Record<string, number>> = { d: 24 * 60, h: 60, m: 1 };

/** Exclusive upper bound, in minutes, of each bucket below `gte_7d`, in ascending order. */
const BUCKET_UPPER_BOUNDS: ReadonlyArray<readonly [AlertZeroScheduleIntervalBucket, number]> = [
  ['lt_15m', 15],
  ['15m_to_lt_1h', 60],
  ['1h_to_lt_6h', 6 * 60],
  ['6h_to_lt_24h', 24 * 60],
  ['24h_to_lt_7d', 7 * 24 * 60],
];

const toMinutes = (interval: string): number | undefined => {
  const match = /^([1-9][0-9]*)([mhd])$/.exec(interval);
  return match ? Number(match[1]) * MINUTES_PER_UNIT[match[2]] : undefined;
};

/** Maps a Worker schedule interval (for example `24h`) to its reporting bucket. */
export const bucketScheduleInterval = (interval: string): AlertZeroScheduleIntervalBucket => {
  const minutes = toMinutes(interval);
  if (minutes === undefined) {
    return 'unknown';
  }
  return BUCKET_UPPER_BOUNDS.find(([, upperBound]) => minutes < upperBound)?.[0] ?? 'gte_7d';
};
