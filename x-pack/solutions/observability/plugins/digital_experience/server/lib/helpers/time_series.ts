/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { calculateAuto } from '@kbn/calculate-auto';
import type { TimeSeriesPoint } from '../../../common/types/applications';

/** About this many buckets over the time range, rounded to a readable interval. */
const TARGET_BUCKETS = 50;

/** Interval of `dateHistogram` in seconds; the same range always gives the same interval. */
export const getBucketSizeSeconds = (start: number, end: number): number =>
  Math.max(
    Math.round(calculateAuto.near(TARGET_BUCKETS, moment.duration(end - start))?.asSeconds() ?? 0),
    1
  );

/** Counts over the time range, empty buckets included, so every source returns the same ones. */
export const dateHistogram = (start: number, end: number) => ({
  date_histogram: {
    field: '@timestamp',
    fixed_interval: `${getBucketSizeSeconds(start, end)}s`,
    min_doc_count: 0,
    extended_bounds: { min: start, max: end },
  },
});

export interface DateHistogramAggregation {
  buckets: Array<{ key: number; doc_count: number }>;
}

export const toTimeSeries = (aggregation?: DateHistogramAggregation): TimeSeriesPoint[] =>
  (aggregation?.buckets ?? []).map(({ key, doc_count: count }) => ({ timestamp: key, count }));
