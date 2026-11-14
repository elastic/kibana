/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toQueriedRange, toTimeRangeQuery } from './time_range_query';

const TIME_RANGE = { rangeFrom: '2021-01-18T12:00:00.000Z', rangeTo: '2021-01-18T13:00:00.000Z' };

describe('toTimeRangeQuery', () => {
  it('sends the range as ISO dates, with the selected environment and time zone', () => {
    expect(toTimeRangeQuery(TIME_RANGE, 'production', 'America/New_York')).toEqual({
      start: '2021-01-18T12:00:00.000Z',
      end: '2021-01-18T13:00:00.000Z',
      environment: 'production',
      timeZone: 'America/New_York',
    });
  });

  it('leaves the environment out when all are selected', () => {
    expect(toTimeRangeQuery(TIME_RANGE, undefined, 'UTC')).not.toHaveProperty('environment');
  });

  it('leaves the time zone out for the routes that take none', () => {
    expect(toTimeRangeQuery(TIME_RANGE, 'production')).not.toHaveProperty('timeZone');
  });
});

describe('toQueriedRange', () => {
  it('reads the queried range as epoch milliseconds', () => {
    expect(toQueriedRange(toTimeRangeQuery(TIME_RANGE, undefined))).toEqual({
      start: Date.parse(TIME_RANGE.rangeFrom),
      end: Date.parse(TIME_RANGE.rangeTo),
    });
  });
});
