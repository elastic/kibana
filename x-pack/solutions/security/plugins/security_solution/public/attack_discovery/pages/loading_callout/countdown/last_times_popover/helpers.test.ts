/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { getAverageIntervalSeconds, getTimerPrefix } from './helpers';
import { APPROXIMATE_TIME_REMAINING, ABOVE_THE_AVERAGE_TIME } from '../translations';
import type { GenerationInterval } from '@kbn/elastic-assistant-common';

describe('helpers', () => {
  describe('getAverageIntervalSeconds', () => {
    it('returns 0 when the intervals array is empty', () => {
      const intervals: GenerationInterval[] = [];

      const average = getAverageIntervalSeconds(intervals);

      expect(average).toEqual(0);
    });

    it('calculates the average interval in seconds', () => {
      const intervals: GenerationInterval[] = [
        {
          date: '2024-04-15T13:48:44.397Z',
          durationMs: 85807,
        },
        {
          date: '2024-04-15T12:41:15.255Z',
          durationMs: 12751,
        },
        {
          date: '2024-04-12T20:59:13.238Z',
          durationMs: 46169,
        },
        {
          date: '2024-04-12T19:34:56.701Z',
          durationMs: 86674,
        },
      ];

      const average = getAverageIntervalSeconds(intervals);

      expect(average).toEqual(57);
    });
  });

  describe('getTimerPrefix', () => {
    it('returns APPROXIMATE_TIME_REMAINING when approximateFutureTime is null', () => {
      const approximateFutureTime: Date | null = null;

      const result = getTimerPrefix(approximateFutureTime);

      expect(result).toEqual(APPROXIMATE_TIME_REMAINING);
    });

    it('returns APPROXIMATE_TIME_REMAINING when approximateFutureTime is in the future', () => {
      const approximateFutureTime = moment().add(1, 'minute').toDate();
      const result = getTimerPrefix(approximateFutureTime);

      expect(result).toEqual(APPROXIMATE_TIME_REMAINING);
    });

    it('returns ABOVE_THE_AVERAGE_TIME when approximateFutureTime is in the past', () => {
      const approximateFutureTime = moment().subtract(1, 'minute').toDate();

      const result = getTimerPrefix(approximateFutureTime);

      expect(result).toEqual(ABOVE_THE_AVERAGE_TIME);
    });
  });
});
