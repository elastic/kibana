/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import moment from 'moment';
import type { TimeRange } from '@kbn/es-query';

export type TimeRangeCheck = 'valid' | 'invalid' | 'not_allowed';

/**
 * Checks a time range against the maximum: it is not allowed when it is longer than `maxDays` or
 * starts earlier than `maxDays` ago, the same restriction the date picker applies with `minDate`.
 */
export const checkTimeRange = (
  range: TimeRange,
  maxDays: number,
  now: Date = new Date()
): TimeRangeCheck => {
  const from = dateMath.parse(range.from, { forceNow: now });
  const to = dateMath.parse(range.to, { roundUp: true, forceNow: now });

  if (!from?.isValid() || !to?.isValid() || from.isAfter(to)) {
    return 'invalid';
  }
  if (!Number.isFinite(maxDays)) {
    return 'valid';
  }

  const pastEnd = moment.min(to, moment(now));
  const isTooLong = pastEnd.diff(from, 'days', true) > maxDays;
  const isTooOld = from.isBefore(moment(now).subtract(maxDays, 'days'));

  return isTooLong || isTooOld ? 'not_allowed' : 'valid';
};

/** The widest range allowed: from `maxDays` ago until now. */
export const getMaxTimeRange = (maxDays: number): TimeRange => ({
  from: `now-${maxDays}d`,
  to: 'now',
});
