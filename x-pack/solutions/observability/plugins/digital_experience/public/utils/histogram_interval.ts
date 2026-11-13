/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import type { HistogramInterval } from '../../common/types/applications';

/** The interval of a chart without buckets, which shades nothing. */
export const NO_BUCKETS_INTERVAL: HistogramInterval = { value: 1, unit: 's' };

/** The end of the bucket starting at `key`, in `timeZone`, as a calendar month or day can vary. */
export const getBucketEnd = (
  key: number,
  { value, unit }: HistogramInterval,
  timeZone: string
): number => {
  return moment.tz(key, timeZone).add(value, unit).valueOf();
};
