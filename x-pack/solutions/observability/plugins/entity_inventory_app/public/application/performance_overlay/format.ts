/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryShardStats } from '@kbn/entity-inventory-plugin/common';
import { SHARDS_FAILED, SHARDS_SKIPPED } from './translations';

export const EMPTY_VALUE = '—';

/** Milliseconds with two decimals under 1, one under 100, none above. */
export const formatMs = (ms: number | null): string => {
  if (ms === null) {
    return EMPTY_VALUE;
  }
  const abs = Math.abs(ms);
  const digits = abs < 1 ? 2 : abs < 100 ? 1 : 0;
  return ms.toFixed(digits);
};

/** Nanoseconds as milliseconds, rounded as `formatMs` does. */
export const formatNanosAsMs = (nanos: number | null): string =>
  formatMs(nanos === null ? null : nanos / 1_000_000);

export const formatCount = (count: number | null): string =>
  count === null ? EMPTY_VALUE : count.toLocaleString();

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export const formatBytes = (bytes: number | null): string => {
  if (bytes === null) {
    return EMPTY_VALUE;
  }
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${BYTE_UNITS[unit]}`;
};

/** Successful over total shards, with the skipped and failed counts when any. */
export const formatShards = (shards: QueryShardStats | null): string => {
  if (shards === null) {
    return EMPTY_VALUE;
  }
  const { total, successful, skipped, failed } = shards;
  const extras = [
    skipped ? SHARDS_SKIPPED(skipped) : null,
    failed ? SHARDS_FAILED(failed) : null,
  ].filter((extra): extra is string => extra !== null);
  const base = `${successful ?? EMPTY_VALUE}/${total}`;
  return extras.length > 0 ? `${base} (${extras.join(', ')})` : base;
};

/** The largest value, or null when there is none. */
export const maxOf = (values: ReadonlyArray<number | null>): number | null =>
  values.reduce<number | null>(
    (max, value) => (value === null ? max : max === null ? value : Math.max(max, value)),
    null
  );

/** The sum of the values present, or null when none is. */
export const sumOf = (values: ReadonlyArray<number | null>): number | null =>
  values.reduce<number | null>((sum, value) => (value === null ? sum : (sum ?? 0) + value), null);
