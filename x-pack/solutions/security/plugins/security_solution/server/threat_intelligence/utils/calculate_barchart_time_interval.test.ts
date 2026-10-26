/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { calculateBarchartColumnTimeInterval } from './calculate_barchart_time_interval';

const mockValidStringDate = '1 Jan 2022 00:00:00 GMT';

describe('calculateBarchartTimeInterval', () => {
  it('should handle number dates', () => {
    const from = moment(mockValidStringDate).valueOf();
    const to = moment(mockValidStringDate).add(1, 'days').valueOf();

    const interval = calculateBarchartColumnTimeInterval(from, to);
    expect(interval).toContain('ms');
    expect(parseInt(interval, 10) > 0).toBeTruthy();
  });

  it('should handle moment dates', () => {
    const from = moment(mockValidStringDate);
    const to = moment(mockValidStringDate).add(1, 'days');

    const interval = calculateBarchartColumnTimeInterval(from, to);
    expect(interval).toContain('ms');
    expect(parseInt(interval, 10) > 0).toBeTruthy();
  });

  it('should handle dateTo older than dateFrom', () => {
    const from = moment(mockValidStringDate).add(1, 'days');
    const to = moment(mockValidStringDate);

    const interval = calculateBarchartColumnTimeInterval(from, to);
    expect(parseInt(interval, 10) > 0).toBeFalsy();
  });
});
