/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export const createTimerange = (
  interval: number,
  timeframe: { end: string; start: string },
  lastPeriodEnd?: number,
  isRateAgg?: boolean
) => {
  const end = moment(timeframe.end).valueOf();
  let start = moment(timeframe.start).valueOf();

  const minimumBuckets = isRateAgg ? 2 : 1;

  interval = interval * minimumBuckets;
  start = end - interval;

  if (lastPeriodEnd && lastPeriodEnd - interval < start) {
    const maxAllowedLookBack = moment(start).subtract(3 * interval, 'ms');
    // Calculate the maximum allowable look-back time (3 intervals before the current 'start' time).
    if (moment(lastPeriodEnd).isAfter(maxAllowedLookBack)) {
      // Ensure lastPeriodEnd is within the allowable look-back range.
      start = lastPeriodEnd - interval;
    }
  }

  return { start, end };
};
