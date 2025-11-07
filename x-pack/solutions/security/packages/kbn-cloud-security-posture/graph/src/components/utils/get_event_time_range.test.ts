/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnifiedTimeRange } from './get_event_time_range';

describe('getUnifiedTimeRange', () => {
  describe('for events (non-alerts)', () => {
    it('should return time range with ±30m window based on timestamp', () => {
      const timestamp = '2025-01-15T10:00:00.000Z';
      const result = getUnifiedTimeRange(timestamp, false);

      expect(result).toEqual({
        start: `${timestamp}||-30m`,
        end: `${timestamp}||+30m`,
      });
    });

    it('should ignore originalEventTime for events', () => {
      const timestamp = '2025-01-15T10:00:00.000Z';
      const originalEventTime = '2025-01-10T10:00:00.000Z';
      const result = getUnifiedTimeRange(timestamp, false, originalEventTime);

      expect(result).toEqual({
        start: `${timestamp}||-30m`,
        end: `${timestamp}||+30m`,
      });
    });
  });

  describe('for alerts without originalEventTime', () => {
    it('should return time range with ±30m window based on timestamp when originalEventTime is undefined', () => {
      const timestamp = '2025-01-15T10:00:00.000Z';
      const result = getUnifiedTimeRange(timestamp, true);

      expect(result).toEqual({
        start: `${timestamp}||-30m`,
        end: `${timestamp}||+30m`,
      });
    });

    it('should return time range with ±30m window based on timestamp when originalEventTime is null', () => {
      const timestamp = '2025-01-15T10:00:00.000Z';
      const result = getUnifiedTimeRange(timestamp, true, null);

      expect(result).toEqual({
        start: `${timestamp}||-30m`,
        end: `${timestamp}||+30m`,
      });
    });
  });

  describe('for alerts with originalEventTime', () => {
    it('should use alert time when it is earlier than original event time', () => {
      const alertTime = '2025-01-15T10:00:00.000Z';
      const originalEventTime = '2025-01-15T14:00:00.000Z';

      const result = getUnifiedTimeRange(alertTime, true, originalEventTime);

      expect(result).toEqual({
        start: `${alertTime}||-30m`,
        end: `${originalEventTime}||+30m`,
      });
    });

    it('should use original event time when it is earlier than alert time', () => {
      const alertTime = '2025-01-15T14:00:00.000Z';
      const originalEventTime = '2025-01-15T10:00:00.000Z';

      const result = getUnifiedTimeRange(alertTime, true, originalEventTime);

      expect(result).toEqual({
        start: `${originalEventTime}||-30m`,
        end: `${alertTime}||+30m`,
      });
    });

    it('should handle same timestamp for alert and original event', () => {
      const timestamp = '2025-01-15T10:00:00.000Z';

      const result = getUnifiedTimeRange(timestamp, true, timestamp);

      expect(result).toEqual({
        start: `${timestamp}||-30m`,
        end: `${timestamp}||+30m`,
      });
    });

    it('should handle timestamps spanning multiple days', () => {
      const originalEventTime = '2025-01-10T10:00:00.000Z';
      const alertTime = '2025-01-15T14:00:00.000Z';

      const result = getUnifiedTimeRange(alertTime, true, originalEventTime);

      expect(result).toEqual({
        start: `${originalEventTime}||-30m`,
        end: `${alertTime}||+30m`,
      });
    });

    it('should handle timestamps with milliseconds', () => {
      const originalEventTime = '2025-01-15T10:00:00.123Z';
      const alertTime = '2025-01-15T14:00:00.456Z';

      const result = getUnifiedTimeRange(alertTime, true, originalEventTime);

      expect(result).toEqual({
        start: `${originalEventTime}||-30m`,
        end: `${alertTime}||+30m`,
      });
    });

    it('should handle the realistic scenario: alert created days after the original event', () => {
      const originalEventTime = '2024-10-01T10:15:00.000Z';
      const alertTime = '2024-10-15T14:30:00.000Z';

      const result = getUnifiedTimeRange(alertTime, true, originalEventTime);

      expect(result).toEqual({
        start: `${originalEventTime}||-30m`,
        end: `${alertTime}||+30m`,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle timestamps at midnight', () => {
      const originalEventTime = '2025-01-15T00:00:00.000Z';
      const alertTime = '2025-01-15T23:59:59.999Z';

      const result = getUnifiedTimeRange(alertTime, true, originalEventTime);

      expect(result).toEqual({
        start: `${originalEventTime}||-30m`,
        end: `${alertTime}||+30m`,
      });
    });

    it('should handle timestamps with different timezone formats', () => {
      const originalEventTime = '2025-01-15T10:00:00+00:00';
      const alertTime = '2025-01-15T14:00:00Z';

      const result = getUnifiedTimeRange(alertTime, true, originalEventTime);

      expect(result.start).toContain('||-30m');
      expect(result.end).toContain('||+30m');
    });

    it('should handle very close timestamps (seconds apart)', () => {
      const originalEventTime = '2025-01-15T10:00:00.000Z';
      const alertTime = '2025-01-15T10:00:05.000Z';

      const result = getUnifiedTimeRange(alertTime, true, originalEventTime);

      expect(result).toEqual({
        start: `${originalEventTime}||-30m`,
        end: `${alertTime}||+30m`,
      });
    });
  });
});
