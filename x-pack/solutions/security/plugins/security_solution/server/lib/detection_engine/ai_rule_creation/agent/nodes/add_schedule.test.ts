/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAndValidateSchedule } from './add_schedule';
import { loggerMock } from '@kbn/logging-mocks';
import { defaultSchedule } from '../state';

const mockLogger = loggerMock.create();

describe('parseAndValidateSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('valid inputs', () => {
    it('should parse valid interval and lookback correctly', () => {
      const schedule = {
        interval: '10m',
        lookback: '1m',
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      expect(result).toEqual({
        interval: '10m',
        from: 'now-11m', // interval (10m) + lookback (1m) = 11m
        to: 'now',
      });
    });

    it('should handle different time units correctly', () => {
      const schedule = {
        interval: '1h',
        lookback: '5m',
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      expect(result).toEqual({
        interval: '1h',
        from: 'now-65m', // 1h (60m) + 5m = 65m
        to: 'now',
      });
    });

    it('should handle seconds and convert to appropriate units', () => {
      const schedule = {
        interval: '300s', // 5 minutes
        lookback: '60s', // 1 minute
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      expect(result).toEqual({
        interval: '300s',
        from: 'now-6m', // 300s + 60s = 360s = 6m
        to: 'now',
      });
    });

    it('should handle zero lookback correctly', () => {
      const schedule = {
        interval: '5m',
        lookback: '0m',
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      expect(result).toEqual({
        interval: '5m',
        from: 'now-5m', // interval (5m) + lookback (0m) = 5m
        to: 'now',
      });
    });

    it('should handle large time values correctly', () => {
      const schedule = {
        interval: '24h',
        lookback: '1h',
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      expect(result).toEqual({
        interval: '24h',
        from: 'now-25h', // 24h + 1h = 25h
        to: 'now',
      });
    });
  });

  describe('missing or invalid interval', () => {
    it('should return default schedule when interval is missing', () => {
      const schedule = {
        interval: undefined,
        lookback: '5m',
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      expect(result).toEqual(defaultSchedule);
    });

    it('should return default schedule when interval is empty string', () => {
      const schedule = {
        interval: '',
        lookback: '5m',
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      expect(result).toEqual(defaultSchedule);
    });

    it('should return default schedule when interval is invalid format', () => {
      const schedule = {
        interval: 'invalid',
        lookback: '5m',
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      expect(result).toEqual(defaultSchedule);
    });

    it('should return default schedule when interval is zero', () => {
      const schedule = {
        interval: '0m',
        lookback: '5m',
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      expect(result).toEqual(defaultSchedule);
    });

    it('should return default schedule when interval is negative', () => {
      const schedule = {
        interval: '-5m',
        lookback: '2m',
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      expect(result).toEqual(defaultSchedule);
    });
  });

  describe('missing or invalid lookback', () => {
    it('should use default lookback when lookback is missing', () => {
      const schedule = {
        interval: '10m',
        lookback: undefined,
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      // Should use 10% of interval (10m * 0.1 = 1m) as default lookback
      expect(result).toEqual({
        interval: '10m',
        from: 'now-11m', // 10m + 1m = 11m
        to: 'now',
      });
    });

    it('should use default lookback when lookback is empty string', () => {
      const schedule = {
        interval: '5m',
        lookback: '',
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      // Should use 10% of interval (5m * 0.1 = 30s) as default lookback
      expect(result).toEqual({
        interval: '5m',
        from: 'now-330s', // 5m + 30s
        to: 'now',
      });
    });

    it('should use default lookback when lookback is invalid format', () => {
      const schedule = {
        interval: '10m',
        lookback: 'invalid',
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      // Should use 10% of interval (15m * 0.1 = 90s = 1.5m) as default lookback
      expect(result).toEqual({
        interval: '10m',
        from: 'now-11m', // 15m + 1m30s
        to: 'now',
      });
    });

    it('should use default lookback when lookback is negative', () => {
      const schedule = {
        interval: '20m',
        lookback: '-5m',
      };

      const result = parseAndValidateSchedule(schedule, mockLogger);

      // Should use 10% of interval (20m * 0.1 = 2m) as default lookback
      expect(result).toEqual({
        interval: '20m',
        from: 'now-22m', // 20m + 2m
        to: 'now',
      });
    });
  });

  it('should handle fractional seconds in default lookback calculation', () => {
    const schedule = {
      interval: '3s',
      lookback: undefined,
    };

    const result = parseAndValidateSchedule(schedule, mockLogger);

    expect(result).toEqual({
      interval: '3s',
      from: 'now-3s',
      to: 'now',
    });
  });
});
