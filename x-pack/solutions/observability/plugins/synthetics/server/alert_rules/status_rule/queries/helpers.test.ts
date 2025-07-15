/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { calculateIsValidPing } from './helpers';

describe('helpers', () => {
  describe('calculateIsValidPing', () => {
    // Store the original Date implementation
    const originalDate = global.Date;

    // Mock the current time to be fixed for tests
    const mockCurrentTime = new Date('2025-06-09T10:00:00.000Z').getTime();

    beforeEach(() => {
      // Mock Date to return fixed time for Date.now() and new Date()
      global.Date = class extends Date {
        constructor(...args: Parameters<typeof Date>) {
          if (args.length === 0) {
            super(mockCurrentTime);
          } else {
            super(...args);
          }
        }

        static now() {
          return mockCurrentTime;
        }
      } as any;
    });

    afterEach(() => {
      // Restore original Date implementation
      global.Date = originalDate;
    });

    it('should return true when ping is within schedule + buffer time', () => {
      // Ping was 2 minutes ago, schedule is 5 minutes, buffer is 1 minute (default)
      // Total allowed time: 5 + 1 = 6 minutes
      // 2 minutes < 6 minutes, so ping is valid
      const twoMinutesAgo = new Date(mockCurrentTime - 2 * 60 * 1000).toISOString();

      const result = calculateIsValidPing({
        previousRunEndTimeISO: twoMinutesAgo,
        scheduleInMs: 5 * 60 * 1000, // 5 minutes
      });

      expect(result).toBe(true);
    });

    it('should return false when ping is older than schedule + buffer time', () => {
      // Ping was 7 minutes ago, schedule is 5 minutes, buffer is 1 minute (default)
      // Total allowed time: 5 + 1 = 6 minutes
      // 7 minutes > 6 minutes, so ping is invalid/stale
      const sevenMinutesAgo = new Date(mockCurrentTime - 7 * 60 * 1000).toISOString();

      const result = calculateIsValidPing({
        previousRunEndTimeISO: sevenMinutesAgo,
        scheduleInMs: 5 * 60 * 1000, // 5 minutes
      });

      expect(result).toBe(false);
    });

    it('should respect custom buffer time', () => {
      // Ping was 7 minutes ago, schedule is 5 minutes, custom buffer is 3 minutes
      // Total allowed time: 5 + 3 = 8 minutes
      // 7 minutes < 8 minutes, so ping is valid
      const sevenMinutesAgo = new Date(mockCurrentTime - 7 * 60 * 1000).toISOString();

      const result = calculateIsValidPing({
        previousRunEndTimeISO: sevenMinutesAgo,
        scheduleInMs: 5 * 60 * 1000, // 5 minutes
        minimumTotalBufferMs: 3 * 60 * 1000, // 3 minutes
      });

      expect(result).toBe(true);
    });

    it('should handle very long previousRunDurationUs', () => {
      // Ping was 10 minutes ago, schedule is 5 minutes
      // Previous run duration is 6 minutes (360,000,000 microseconds)
      // Total allowed time: 5 + 6 = 11 minutes
      // 10 minutes < 11 minutes, so ping is valid
      const tenMinutesAgo = new Date(mockCurrentTime - 10 * 60 * 1000).toISOString();

      const result = calculateIsValidPing({
        previousRunEndTimeISO: tenMinutesAgo,
        scheduleInMs: 5 * 60 * 1000, // 5 minutes
        previousRunDurationUs: 6 * 60 * 1000 * 1000, // 6 minutes in microseconds
      });

      expect(result).toBe(true);
    });
  });
});
