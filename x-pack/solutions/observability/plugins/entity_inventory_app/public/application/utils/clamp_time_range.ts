/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { TimeRange } from '@kbn/es-query';

export interface ClampTimeRangeResult {
  range: TimeRange;
  wasClamped: boolean;
  isValid: boolean;
}

const DATEMATH_UNITS_MS: ReadonlyArray<readonly [string, number]> = [
  ['d', 24 * 60 * 60 * 1000],
  ['h', 60 * 60 * 1000],
  ['m', 60 * 1000],
  ['s', 1000],
];

// Expresses a duration with the largest datemath unit that divides it exactly, e.g. 3d.
const toDatemathDuration = (durationMs: number): string => {
  const match = DATEMATH_UNITS_MS.find(([, unitMs]) => durationMs % unitMs === 0);
  return match ? `${durationMs / match[1]}${match[0]}` : `${durationMs}ms`;
};

const isRelative = (value: string): boolean => value.startsWith('now');

/**
 * Limits a time range to `maxMs`, keeping the end of the range and moving the start forward.
 */
export const clampTimeRange = (
  range: TimeRange,
  maxMs: number,
  now: Date = new Date()
): ClampTimeRangeResult => {
  const from = dateMath.parse(range.from, { forceNow: now });
  const to = dateMath.parse(range.to, { roundUp: true, forceNow: now });

  if (!from?.isValid() || !to?.isValid() || from.isAfter(to)) {
    return { range, wasClamped: false, isValid: false };
  }

  if (to.diff(from) <= maxMs) {
    return { range, wasClamped: false, isValid: true };
  }

  if (range.to === 'now') {
    return {
      range: { from: `now-${toDatemathDuration(maxMs)}`, to: 'now' },
      wasClamped: true,
      isValid: true,
    };
  }

  const clampedTo = isRelative(range.to) ? to.toISOString() : range.to;

  return {
    range: { from: to.clone().subtract(maxMs, 'ms').toISOString(), to: clampedTo },
    wasClamped: true,
    isValid: true,
  };
};
