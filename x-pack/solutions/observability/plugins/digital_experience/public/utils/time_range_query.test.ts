/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toTimeRangeQuery } from './time_range_query';

const TIME_RANGE = { rangeFrom: '2021-01-18T12:00:00.000Z', rangeTo: '2021-01-18T13:00:00.000Z' };

describe('toTimeRangeQuery', () => {
  it('sends the range as ISO dates, with the selected environment', () => {
    expect(toTimeRangeQuery(TIME_RANGE, 'production')).toEqual({
      start: '2021-01-18T12:00:00.000Z',
      end: '2021-01-18T13:00:00.000Z',
      environment: 'production',
    });
  });

  it('leaves the environment out when all are selected', () => {
    expect(toTimeRangeQuery(TIME_RANGE, undefined)).not.toHaveProperty('environment');
  });
});
