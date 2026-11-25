/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dateHistogram,
  getBucketTimestamps,
  getHistogramInterval,
  toTimeSeries,
} from './time_series';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const TIME_ZONE = 'America/New_York';

describe('getBucketTimestamps', () => {
  it('lists the buckets of a fixed interval from the one the range starts in', () => {
    expect(getBucketTimestamps(HOUR + 1000, 4 * HOUR, { value: 3600, unit: 's' })).toEqual([
      HOUR,
      2 * HOUR,
      3 * HOUR,
    ]);
  });

  it('lists calendar days and ISO weeks in UTC, as TBUCKET aligns them', () => {
    const start = Date.parse('2026-11-18T10:00:00.000Z');
    expect(
      getBucketTimestamps(start, Date.parse('2026-11-20T01:00:00.000Z'), { value: 1, unit: 'd' })
    ).toEqual([
      Date.parse('2026-11-18T00:00:00.000Z'),
      Date.parse('2026-11-19T00:00:00.000Z'),
      Date.parse('2026-11-20T00:00:00.000Z'),
    ]);
    // 2026-11-18 is a Wednesday; its week starts on Monday the 16th
    expect(
      getBucketTimestamps(start, Date.parse('2026-11-24T00:00:00.000Z'), { value: 1, unit: 'w' })
    ).toEqual([Date.parse('2026-11-16T00:00:00.000Z'), Date.parse('2026-11-23T00:00:00.000Z')]);
  });

  it('starts calendar buckets at local midnight in the time zone', () => {
    expect(
      getBucketTimestamps(
        Date.parse('2026-11-18T10:00:00.000Z'),
        Date.parse('2026-11-20T01:00:00.000Z'),
        { value: 1, unit: 'd' },
        'America/New_York'
      )
    ).toEqual([
      Date.parse('2026-11-18T00:00:00.000-05:00'),
      Date.parse('2026-11-19T00:00:00.000-05:00'),
    ]);
  });

  it('keeps fixed buckets on local times across a daylight saving change, as Elasticsearch does', () => {
    // New York moves from 02:00 EST to 03:00 EDT on 2026-03-08; Elasticsearch's 3-hour buckets
    // then start at 21:00, 00:00 EST, 03:00 and 06:00 EDT, the one across the change 2 hours long.
    expect(
      getBucketTimestamps(
        Date.parse('2026-03-08T04:30:00.000Z'),
        Date.parse('2026-03-08T12:00:00.000Z'),
        { value: 3 * 3600, unit: 's' },
        'America/New_York'
      )
    ).toEqual([
      Date.parse('2026-03-07T21:00:00.000-05:00'),
      Date.parse('2026-03-08T00:00:00.000-05:00'),
      Date.parse('2026-03-08T03:00:00.000-04:00'),
      Date.parse('2026-03-08T06:00:00.000-04:00'),
    ]);
  });

  it('has no bucket for an empty range or an interval of nothing', () => {
    expect(getBucketTimestamps(HOUR, HOUR, { value: 60, unit: 's' })).toEqual([]);
    expect(getBucketTimestamps(0, HOUR, { value: 0, unit: 'd' })).toEqual([]);
  });

  it('aligns fixed buckets in local time, e.g. 3 hours on a half-hour offset', () => {
    expect(
      getBucketTimestamps(
        Date.parse('2026-11-18T00:00:00.000Z'),
        Date.parse('2026-11-18T05:00:00.000Z'),
        { value: 3 * 3600, unit: 's' },
        '+05:30'
      )
    ).toEqual([
      Date.parse('2026-11-18T03:00:00.000+05:30'),
      Date.parse('2026-11-18T06:00:00.000+05:30'),
      Date.parse('2026-11-18T09:00:00.000+05:30'),
    ]);
  });
});

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
  it('returns every bucket of the range in the time zone, empty ones included', () => {
    expect(
      dateHistogram({
        start: 0,
        end: HOUR,
        histogram: { interval: { value: 60, unit: 's' }, timeZone: TIME_ZONE },
      })
    ).toEqual({
      date_histogram: {
        field: '@timestamp',
        fixed_interval: '60s',
        time_zone: TIME_ZONE,
        min_doc_count: 0,
        extended_bounds: { min: 0, max: HOUR },
      },
    });
  });

  it('uses a calendar interval for the calendar units', () => {
    const { date_histogram: daily } = dateHistogram({
      start: 0,
      end: 90 * DAY,
      histogram: { interval: { value: 1, unit: 'd' }, timeZone: TIME_ZONE },
    });

    expect(daily).toMatchObject({ calendar_interval: '1d', time_zone: TIME_ZONE });
    expect(daily).not.toHaveProperty('fixed_interval');
  });

  it('buckets by the given field', () => {
    const { date_histogram: histogram } = dateHistogram({
      start: 0,
      end: HOUR,
      histogram: { interval: { value: 60, unit: 's' }, timeZone: TIME_ZONE },
      field: 'start_time',
    });

    expect(histogram.field).toBe('start_time');
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
