/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LAST_SEEN_COLUMN } from '../generator';
import type { ESQLValue, InventoryRow } from './types';

/** The row's `last_seen` as epoch milliseconds, or null when absent or unparseable. */
export const lastSeenInstant = (row: InventoryRow): number | null => {
  const value = row[LAST_SEEN_COLUMN];
  const instant =
    typeof value === 'number' ? value : typeof value === 'string' ? Date.parse(value) : NaN;
  return Number.isNaN(instant) ? null : instant;
};

export const hasValue = (value: ESQLValue | undefined): value is ESQLValue =>
  value !== null && value !== undefined;

// A missing instant is older than any instant; on a tie the value already held is kept.
export const isNewer = (candidate: number | null, current: number | null): boolean =>
  candidate !== null && (current === null || candidate > current);

export const asList = (names: string | string[]): string[] =>
  Array.isArray(names) ? names : [names];

export const asNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null;

export const asText = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;
