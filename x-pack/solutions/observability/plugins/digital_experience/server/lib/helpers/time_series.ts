/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { range } from 'lodash';
import moment from 'moment-timezone';
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

/** `time` in `timeZone`: a moment-timezone name, or a UTC offset such as `+05:30`. */
const inTimeZone = (time: number, timeZone: string): moment.Moment =>
  moment.tz.zone(timeZone) ? moment.tz(time, timeZone) : moment.utc(time).utcOffset(timeZone);

/**
 * The start of every bucket of `interval` that covers `[start, end)` in `timeZone`, as an ES|QL
 * `TBUCKET` with that `time_zone` lines them up (local midnight for calendar units), so a series
 * can fill the buckets its query left out for having no documents.
 */
export const getBucketTimestamps = (
  start: number,
  end: number,
  { value, unit }: HistogramInterval,
  timeZone: string = 'UTC'
): number[] => {
  if (unit === 's') {
    const step = value * 1000;
    // Rounded in local time, as Elasticsearch rounds a fixed interval in a time zone
    const offset = inTimeZone(start, timeZone).utcOffset() * 60_000;
    return range(Math.floor((start + offset) / step) * step - offset, end, step);
  }
  const timestamps: number[] = [];
  const bucket = inTimeZone(start, timeZone).startOf(unit === 'w' ? 'isoWeek' : unit);
  while (bucket.valueOf() < end) {
    timestamps.push(bucket.valueOf());
    bucket.add(value, unit);
  }
  return timestamps;
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
