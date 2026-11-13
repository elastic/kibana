/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dateHistogram, getHistogramInterval, toTimeSeries } from './time_series';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const TIME_ZONE = 'America/New_York';

describe('getHistogramInterval', () => {
  it('rounds sub-day intervals to a readable number of seconds', () => {
    expect(getHistogramInterval(0, HOUR)).toEqual({ value: 60, unit: 's' });
    expect(getHistogramInterval(0, 24 * HOUR)).toEqual({ value: 30 * 60, unit: 's' });
    expect(getHistogramInterval(0, 30 * DAY)).toEqual({ value: 43200, unit: 's' });
  });

  it('uses calendar intervals from one day up', () => {
    expect(getHistogramInterval(0, 90 * DAY)).toEqual({ value: 1, unit: 'd' });
    expect(getHistogramInterval(0, 365 * DAY)).toEqual({ value: 1, unit: 'w' });
  });

  it('never goes below one second', () => {
    expect(getHistogramInterval(0, 1000)).toEqual({ value: 1, unit: 's' });
  });
});

describe('dateHistogram', () => {
  it('returns every bucket of the range, empty ones included', () => {
    expect(dateHistogram(0, HOUR, TIME_ZONE)).toEqual({
      date_histogram: {
        field: '@timestamp',
        fixed_interval: '60s',
        time_zone: TIME_ZONE,
        min_doc_count: 0,
        extended_bounds: { min: 0, max: HOUR },
      },
    });
  });

  it('passes the time zone with a fixed interval', () => {
    expect(dateHistogram(0, 24 * HOUR, TIME_ZONE).date_histogram).toMatchObject({
      fixed_interval: '1800s',
      time_zone: TIME_ZONE,
    });
    expect(dateHistogram(0, 30 * DAY, TIME_ZONE).date_histogram).toMatchObject({
      fixed_interval: '43200s',
      time_zone: TIME_ZONE,
    });
  });

  it('passes the time zone with a calendar interval', () => {
    const daily = dateHistogram(0, 90 * DAY, TIME_ZONE).date_histogram;
    const weekly = dateHistogram(0, 365 * DAY, TIME_ZONE).date_histogram;

    expect(daily).toMatchObject({ calendar_interval: '1d', time_zone: TIME_ZONE });
    expect(daily).not.toHaveProperty('fixed_interval');
    expect(weekly).toMatchObject({ calendar_interval: '1w', time_zone: TIME_ZONE });
  });

  it('buckets by the given field', () => {
    expect(dateHistogram(0, HOUR, TIME_ZONE, 'start_time').date_histogram.field).toBe('start_time');
  });
});

describe('toTimeSeries', () => {
  it('maps the buckets to points', () => {
    expect(toTimeSeries({ buckets: [{ key: 0, doc_count: 3 }] })).toEqual([
      { timestamp: 0, count: 3 },
    ]);
  });

  it('returns no points without the aggregation', () => {
    expect(toTimeSeries(undefined)).toEqual([]);
  });
});
