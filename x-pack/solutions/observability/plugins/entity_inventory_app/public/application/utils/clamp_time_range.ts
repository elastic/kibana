/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment';
import type { TimeRange } from '@kbn/es-query';

export interface ClampTimeRangeResult {
  range: TimeRange;
  wasClamped: boolean;
  isValid: boolean;
}

const isRelative = (value: string): boolean => value.startsWith('now');

/**
 * Limits a time range to `maxDays`, keeping the end of the range and moving the start forward.
 * Only the part of the range up to now is measured, so "This week" early in the week is left alone.
 * An end in the future is capped at now, so the clamped range never starts before the selected start.
 */
export const clampTimeRange = (
  range: TimeRange,
  maxDays: number,
  now: Date = new Date()
): ClampTimeRangeResult => {
  const from = dateMath.parse(range.from, { forceNow: now });
  const to = dateMath.parse(range.to, { roundUp: true, forceNow: now });

  if (!from?.isValid() || !to?.isValid() || from.isAfter(to)) {
    return { range, wasClamped: false, isValid: false };
  }

  const pastEnd = moment.min(to, moment(now));

  if (pastEnd.diff(from, 'days', true) <= maxDays) {
    return { range, wasClamped: false, isValid: true };
  }

  if (!to.isBefore(now)) {
    return {
      range: { from: `now-${maxDays}d`, to: 'now' },
      wasClamped: true,
      isValid: true,
    };
  }

  const clampedTo = isRelative(range.to) ? to.toISOString() : range.to;

  return {
    range: { from: to.clone().subtract(maxDays, 'days').toISOString(), to: clampedTo },
    wasClamped: true,
    isValid: true,
  };
};
