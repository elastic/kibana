/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateDateHistogramOffset } from './calculate_date_histogram_offset';
import moment from 'moment';

describe('calculateDateHistogramOffset(timerange)', () => {
  it('should just work', () => {
    const timerange = {
      from: moment('2020-01-01T00:03:32').valueOf(),
      to: moment('2020-01-01T01:03:32').valueOf(),
      interval: '1m',
      field: '@timestamp',
    };
    const offset = calculateDateHistogramOffset(timerange);
    expect(offset).toBe('-28000ms');
  });
  it('should work with un-even timeranges (60s buckets)', () => {
    const timerange = {
      from: 1625057349373,
      to: 1625057649373,
      interval: '60s',
      field: '@timestamp',
    };
    const offset = calculateDateHistogramOffset(timerange);
    expect(offset).toBe('-51373ms');
  });
  it('should work with un-even timeranges (5m buckets)', () => {
    const timerange = {
      from: 1625516185059,
      to: 1625602885059,
      interval: '5m',
      field: '@timestamp',
    };
    const offset = calculateDateHistogramOffset(timerange);
    expect(offset).toBe('-215059ms');
  });
  it('should work with un-even timeranges (>=10s buckets)', () => {
    const timerange = {
      from: 1625516185059,
      to: 1625602885059,
      interval: '>=10s',
      field: '@timestamp',
    };
    const offset = calculateDateHistogramOffset(timerange);
    expect(offset).toBe('-215059ms');
  });
});
