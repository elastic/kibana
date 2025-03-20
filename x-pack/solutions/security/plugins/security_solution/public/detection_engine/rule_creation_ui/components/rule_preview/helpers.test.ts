/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { isNoisy, getTimeframeOptions } from './helpers';

describe('query_preview/helpers', () => {
  const timeframeEnd = moment();
  const startHourAgo = timeframeEnd.clone().subtract(1, 'hour');
  const startDayAgo = timeframeEnd.clone().subtract(1, 'day');
  const startMonthAgo = timeframeEnd.clone().subtract(1, 'month');

  const lastHourTimeframe = {
    timeframeStart: startHourAgo,
    timeframeEnd,
    interval: '5m',
    lookback: '1m',
  };
  const lastDayTimeframe = {
    timeframeStart: startDayAgo,
    timeframeEnd,
    interval: '1h',
    lookback: '5m',
  };
  const lastMonthTimeframe = {
    timeframeStart: startMonthAgo,
    timeframeEnd,
    interval: '1d',
    lookback: '1h',
  };

  describe('isNoisy', () => {
    test('returns true if timeframe selection is "Last hour" and average hits per hour is greater than one execution duration', () => {
      const isItNoisy = isNoisy(30, lastHourTimeframe);

      expect(isItNoisy).toBeTruthy();
    });

    test('returns false if timeframe selection is "Last hour" and average hits per hour is less than one execution duration', () => {
      const isItNoisy = isNoisy(0, lastHourTimeframe);

      expect(isItNoisy).toBeFalsy();
    });

    test('returns true if timeframe selection is "Last day" and average hits per hour is greater than one execution duration', () => {
      const isItNoisy = isNoisy(50, lastDayTimeframe);

      expect(isItNoisy).toBeTruthy();
    });

    test('returns false if timeframe selection is "Last day" and average hits per hour is equal to one execution duration', () => {
      const isItNoisy = isNoisy(24, lastDayTimeframe);

      expect(isItNoisy).toBeFalsy();
    });

    test('returns false if timeframe selection is "Last day" and hits is 0', () => {
      const isItNoisy = isNoisy(0, lastDayTimeframe);

      expect(isItNoisy).toBeFalsy();
    });

    test('returns true if timeframe selection is "Last month" and average hits per hour is greater than one execution duration', () => {
      const isItNoisy = isNoisy(750, lastMonthTimeframe);

      expect(isItNoisy).toBeTruthy();
    });

    test('returns false if timeframe selection is "Last month" and average hits per hour is equal to one execution duration', () => {
      const isItNoisy = isNoisy(30, lastMonthTimeframe);

      expect(isItNoisy).toBeFalsy();
    });

    test('returns false if timeframe selection is "Last month" and hits is 0', () => {
      const isItNoisy = isNoisy(0, lastMonthTimeframe);

      expect(isItNoisy).toBeFalsy();
    });
  });

  describe('getTimeframeOptions', () => {
    test('returns hour and day options if ruleType is eql', () => {
      const options = getTimeframeOptions('eql');

      expect(options).toEqual([
        { value: 'h', text: 'Last hour' },
        { value: 'd', text: 'Last day' },
      ]);
    });

    test('returns hour, day, and month options if ruleType is not eql or threshold', () => {
      const options = getTimeframeOptions('query');

      expect(options).toEqual([
        { value: 'h', text: 'Last hour' },
        { value: 'd', text: 'Last day' },
        { value: 'M', text: 'Last month' },
      ]);
    });

    test('returns hour option if ruleType is threshold', () => {
      const options = getTimeframeOptions('threshold');

      expect(options).toEqual([{ value: 'h', text: 'Last hour' }]);
    });
  });
});
