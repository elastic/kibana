/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import moment from 'moment';
import { calculateAuto } from '@kbn/calculate-auto';
import { TARGET_BUCKETS } from '../../../common/histogram';
import type { HistogramInterval, TimeSeriesPoint } from '../../../common/types/applications';

const CALENDAR_UNITS: ReadonlyArray<HistogramInterval['unit']> = ['d', 'w', 'M', 'y'];

/** A calendar day, week, month or year when the auto interval is exactly one, seconds below. */
export const getHistogramInterval = (start: number, end: number): HistogramInterval => {
  const interval = calculateAuto.near(TARGET_BUCKETS, moment.duration(end - start));
  const calendarUnit = CALENDAR_UNITS.find(
    (unit) => interval?.asMilliseconds() === moment.duration(1, unit).asMilliseconds()
  );

  if (calendarUnit) {
    return { value: 1, unit: calendarUnit };
  }

  return { value: Math.max(Math.round(interval?.asSeconds() ?? 0), 1), unit: 's' };
};

/** The buckets of a request's date histograms, built once per request for every search. */
export interface HistogramParams {
  /** Their width, from `getHistogramInterval`. */
  interval: HistogramInterval;
  /** The time zone they line up with: a moment-timezone name or a UTC offset. */
  timeZone: string;
}

/**
 * Counts over the time range in buckets of `histogram`, empty ones included, so every source
 * returns the same ones. The documents are bucketed by `field`, the event time by default.
 */
export const dateHistogram = ({
  start,
  end,
  histogram: {
    interval: { value, unit },
    timeZone,
  },
  field = '@timestamp',
}: {
  start: number;
  end: number;
  histogram: HistogramParams;
  field?: string;
}): { date_histogram: estypes.AggregationsDateHistogramAggregation } => {
  return {
    date_histogram: {
      field,
      ...(unit === 's' ? { fixed_interval: `${value}s` } : { calendar_interval: `1${unit}` }),
      time_zone: timeZone,
      min_doc_count: 0,
      extended_bounds: { min: start, max: end },
    },
  };
};

export interface DateHistogramAggregation {
  buckets: Array<{ key: number; doc_count: number }>;
}

export const toTimeSeries = (aggregation?: DateHistogramAggregation): TimeSeriesPoint[] =>
  (aggregation?.buckets ?? []).map(({ key, doc_count: count }) => ({ timestamp: key, count }));
