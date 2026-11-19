/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Sessions are split by the first 32 bits of the SHA-256 of their `session.id`, so the partitions
 * are even whatever the ids look like: EDOT Browser writes lowercase hex, EDOT iOS uppercase, and
 * other SDKs may write anything.
 */
export const HASH_SPACE = 2 ** 32;
const HASH_DIGITS = 8;

/** The sessions whose hash prefix is in [from, to). */
export interface HashRange {
  from: number;
  to: number;
}

export const FULL_HASH_RANGE: HashRange = { from: 0, to: HASH_SPACE };

/** `count` ranges of about equal size that cover every session. */
export const hashRanges = (count: number): HashRange[] => {
  const parts = Math.max(1, Math.min(Math.floor(count), HASH_SPACE));
  return Array.from({ length: parts }, (_, index) => ({
    from: Math.floor((index * HASH_SPACE) / parts),
    to: Math.floor(((index + 1) * HASH_SPACE) / parts),
  }));
};

/**
 * A bound as a hash prefix. A hash is longer than its prefix, so it compares as greater than or
 * equal to its own prefix and less than the next one, which keeps the ranges half-open.
 */
export const hashPrefix = (bound: number): string => bound.toString(16).padStart(HASH_DIGITS, '0');
