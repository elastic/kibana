/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDateISORange } from '@kbn/timerange';
import type { TimeRange } from '../hooks/use_time_range';

export interface TimeRangeQuery {
  start: string;
  end: string;
  environment?: string;
  /** The IANA time zone of the histogram buckets, for the routes that chart over time. */
  timeZone?: string;
}

/** The query the routes read the time range, environment and time zone from; no environment is all. */
export const toTimeRangeQuery = (
  { rangeFrom, rangeTo }: TimeRange,
  environment: string | undefined,
  timeZone?: string
): TimeRangeQuery => {
  const { startDate, endDate } = getDateISORange({ from: rangeFrom, to: rangeTo });
  return {
    start: startDate,
    end: endDate,
    ...(environment ? { environment } : {}),
    ...(timeZone ? { timeZone } : {}),
  };
};

/** Start and end of a queried time range, in epoch milliseconds. */
export interface QueriedRange {
  start: number;
  end: number;
}

/** The range a query covers, which a relative one like "last 24 hours" resolves per request. */
export const toQueriedRange = ({ start, end }: TimeRangeQuery): QueriedRange => {
  return { start: Date.parse(start), end: Date.parse(end) };
};
