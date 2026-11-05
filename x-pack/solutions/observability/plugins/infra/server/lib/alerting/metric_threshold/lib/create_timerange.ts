/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Aggregators } from '../../../../../common/alerting/metrics';

export const createTimerange = (
  interval: number,
  aggType: Aggregators,
  timeframe?: { end: number; start?: number },
  lastPeriodEnd?: number,
  scheduleInterval: number = 0
): { start: number; end: number } => {
  const end = moment(timeframe && timeframe.end ? timeframe.end : Date.now()).valueOf();
  const start = moment(timeframe && timeframe.start ? timeframe.start : end).valueOf();

  // Rate aggregations need 5 buckets worth of data
  const minimumBuckets = aggType === Aggregators.RATE ? 2 : 1;

  interval = interval * minimumBuckets;

  let calculatedFrom = end - interval;

  if (lastPeriodEnd && lastPeriodEnd - interval < start) {
    const maxAllowedLookBack = moment(start).subtract(
      3 * Math.max(interval, scheduleInterval),
      'ms'
    );
    // Runs are one schedule interval apart, so bound the look-back by the window or the schedule, whichever is longer.
    if (moment(lastPeriodEnd).isAfter(maxAllowedLookBack)) {
      // Ensure lastPeriodEnd is within the allowable look-back range.
      calculatedFrom = lastPeriodEnd - interval;
    }
  }
  const from =
    timeframe && timeframe.start && timeframe.start <= calculatedFrom
      ? timeframe.start
      : calculatedFrom;
  return { start: from, end };
};
