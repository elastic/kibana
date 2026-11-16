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
}

/** The query the routes read the time range and environment from; no environment is all. */
export const toTimeRangeQuery = (
  { rangeFrom, rangeTo }: TimeRange,
  environment: string | undefined
): TimeRangeQuery => {
  const { startDate, endDate } = getDateISORange({ from: rangeFrom, to: rangeTo });
  return { start: startDate, end: endDate, ...(environment ? { environment } : {}) };
};
