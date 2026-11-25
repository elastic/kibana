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

/**
 * The most buckets `getBucketTimestamps` lists, far above what `getHistogramInterval` picks, so a
 * hand-made interval over a long range can't expand without bound.
 */
const MAX_BUCKETS = 2_000;

/** `time` in `timeZone`: a moment-timezone name, or a UTC offset such as `+05:30`. */
const inTimeZone = (time: number, timeZone: string): moment.Moment =>
  moment.tz.zone(timeZone) ? moment.tz(time, timeZone) : moment.utc(time).utcOffset(timeZone);

/**
 * Buckets of `step` milliseconds aligned in local time, as Elasticsearch rounds a fixed interval
 * in a time zone. A zone keeps local wall-clock times across a daylight saving change (e.g. 00:00
 * then 03:00), so the bucket that spans it is shorter or longer; a UTC offset has none.
 */
const fixedBucketTimestamps = (
  start: number,
  end: number,
  step: number,
  timeZone: string
): number[] => {
  const offset = inTimeZone(start, timeZone).utcOffset() * 60_000;
  const firstWallClock = Math.floor((start + offset) / step) * step;
  if (!moment.tz.zone(timeZone)) {
    // A fixed offset has no daylight saving: every bucket is `step` long
    const first = firstWallClock - offset;
    return range(first, Math.min(end, first + MAX_BUCKETS * step), step);
  }
  const timestamps: number[] = [];
  for (let wallClock = firstWallClock; timestamps.length < MAX_BUCKETS; wallClock += step) {
    // This local wall-clock time in the zone; one a change skips moves on to the next bucket's
    const time = moment.tz(moment.utc(wallClock).toArray(), timeZone).valueOf();
    if (time >= end) {
      break;
    }
    if (time !== timestamps[timestamps.length - 1]) {
      timestamps.push(time);
    }
  }
  return timestamps;
};

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
  if (start >= end || value <= 0) {
    return [];
  }
  if (unit === 's') {
    return fixedBucketTimestamps(start, end, value * 1000, timeZone);
  }
  const timestamps: number[] = [];
  const bucket = inTimeZone(start, timeZone).startOf(unit === 'w' ? 'isoWeek' : unit);
  while (bucket.valueOf() < end && timestamps.length < MAX_BUCKETS) {
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
