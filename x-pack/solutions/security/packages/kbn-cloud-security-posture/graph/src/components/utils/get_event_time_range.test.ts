/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEventTimeRange, getEventTimeRangeForSingleAlert } from './get_event_time_range';

describe('getEventTimeRange', () => {
  describe('when there are no alerts with originalTime', () => {
    it('should return undefined for both start and end when originEventIds is empty', () => {
      const result = getEventTimeRange([]);
      expect(result).toEqual({
        eventTimeStart: undefined,
        eventTimeEnd: undefined,
      });
    });

    it('should return undefined when all events are not alerts', () => {
      const result = getEventTimeRange([
        { id: 'event-1', isAlert: false, originalTime: '2025-01-15T10:00:00Z' },
        { id: 'event-2', isAlert: false, originalTime: '2025-01-15T11:00:00Z' },
      ]);
      expect(result).toEqual({
        eventTimeStart: undefined,
        eventTimeEnd: undefined,
      });
    });

    it('should return undefined when alerts have no originalTime', () => {
      const result = getEventTimeRange([
        { id: 'alert-1', isAlert: true },
        { id: 'alert-2', isAlert: true, originalTime: undefined },
      ]);
      expect(result).toEqual({
        eventTimeStart: undefined,
        eventTimeEnd: undefined,
      });
    });
  });

  describe('when there is a single alert with originalTime', () => {
    it('should return time range with ±30m window', () => {
      const originalTime = '2025-01-15T10:00:00.000Z';
      const result = getEventTimeRange([{ id: 'alert-1', isAlert: true, originalTime }]);

      expect(result).toEqual({
        eventTimeStart: `${originalTime}||-30m`,
        eventTimeEnd: `${originalTime}||+30m`,
      });
    });

    it('should ignore non-alert events when calculating time range', () => {
      const alertTime = '2025-01-15T10:00:00.000Z';
      const result = getEventTimeRange([
        { id: 'event-1', isAlert: false, originalTime: '2025-01-15T08:00:00.000Z' },
        { id: 'alert-1', isAlert: true, originalTime: alertTime },
        { id: 'event-2', isAlert: false, originalTime: '2025-01-15T12:00:00.000Z' },
      ]);

      expect(result).toEqual({
        eventTimeStart: `${alertTime}||-30m`,
        eventTimeEnd: `${alertTime}||+30m`,
      });
    });
  });

  describe('when there are multiple alerts with originalTime', () => {
    it('should use earliest time - 30m as start and latest time + 30m as end', () => {
      const earliestTime = '2025-01-15T10:00:00.000Z';
      const middleTime = '2025-01-15T12:00:00.000Z';
      const latestTime = '2025-01-15T14:00:00.000Z';

      const result = getEventTimeRange([
        { id: 'alert-1', isAlert: true, originalTime: middleTime },
        { id: 'alert-2', isAlert: true, originalTime: earliestTime },
        { id: 'alert-3', isAlert: true, originalTime: latestTime },
      ]);

      expect(result).toEqual({
        eventTimeStart: `${earliestTime}||-30m`,
        eventTimeEnd: `${latestTime}||+30m`,
      });
    });

    it('should handle alerts with same originalTime', () => {
      const originalTime = '2025-01-15T10:00:00.000Z';
      const result = getEventTimeRange([
        { id: 'alert-1', isAlert: true, originalTime },
        { id: 'alert-2', isAlert: true, originalTime },
      ]);

      expect(result).toEqual({
        eventTimeStart: `${originalTime}||-30m`,
        eventTimeEnd: `${originalTime}||+30m`,
      });
    });

    it('should ignore alerts without originalTime when others have it', () => {
      const validTime1 = '2025-01-15T10:00:00.000Z';
      const validTime2 = '2025-01-15T12:00:00.000Z';

      const result = getEventTimeRange([
        { id: 'alert-1', isAlert: true, originalTime: validTime1 },
        { id: 'alert-2', isAlert: true }, // No originalTime
        { id: 'alert-3', isAlert: true, originalTime: validTime2 },
      ]);

      expect(result).toEqual({
        eventTimeStart: `${validTime1}||-30m`,
        eventTimeEnd: `${validTime2}||+30m`,
      });
    });

    it('should handle dates spanning multiple days', () => {
      const day1 = '2025-01-15T23:30:00.000Z';
      const day2 = '2025-01-16T00:15:00.000Z';
      const day3 = '2025-01-17T10:00:00.000Z';

      const result = getEventTimeRange([
        { id: 'alert-1', isAlert: true, originalTime: day2 },
        { id: 'alert-2', isAlert: true, originalTime: day3 },
        { id: 'alert-3', isAlert: true, originalTime: day1 },
      ]);

      expect(result).toEqual({
        eventTimeStart: `${day1}||-30m`,
        eventTimeEnd: `${day3}||+30m`,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle millisecond precision timestamps', () => {
      const time = '2025-01-15T10:00:00.123Z';
      const result = getEventTimeRange([{ id: 'alert-1', isAlert: true, originalTime: time }]);

      expect(result).toEqual({
        eventTimeStart: `${time}||-30m`,
        eventTimeEnd: `${time}||+30m`,
      });
    });

    it('should handle mixed alert and event types', () => {
      const alertTime1 = '2025-01-15T10:00:00.000Z';
      const alertTime2 = '2025-01-15T14:00:00.000Z';

      const result = getEventTimeRange([
        { id: 'event-1', isAlert: false, originalTime: '2025-01-15T08:00:00.000Z' },
        { id: 'alert-1', isAlert: true, originalTime: alertTime1 },
        { id: 'event-2', isAlert: false },
        { id: 'alert-2', isAlert: true, originalTime: alertTime2 },
        { id: 'event-3', isAlert: false, originalTime: '2025-01-15T16:00:00.000Z' },
      ]);

      expect(result).toEqual({
        eventTimeStart: `${alertTime1}||-30m`,
        eventTimeEnd: `${alertTime2}||+30m`,
      });
    });
  });
});

describe('getEventTimeRangeForSingleAlert', () => {
  describe('when parameters are invalid', () => {
    it('should return undefined when isAlert is false', () => {
      const result = getEventTimeRangeForSingleAlert(false, '2025-01-15T10:00:00.000Z');
      expect(result).toEqual({
        eventTimeStart: undefined,
        eventTimeEnd: undefined,
      });
    });

    it('should return undefined when originalTime is null', () => {
      const result = getEventTimeRangeForSingleAlert(true, null);
      expect(result).toEqual({
        eventTimeStart: undefined,
        eventTimeEnd: undefined,
      });
    });

    it('should return undefined when originalTime is undefined', () => {
      const result = getEventTimeRangeForSingleAlert(true, undefined);
      expect(result).toEqual({
        eventTimeStart: undefined,
        eventTimeEnd: undefined,
      });
    });

    it('should return undefined when both isAlert is false and originalTime is null', () => {
      const result = getEventTimeRangeForSingleAlert(false, null);
      expect(result).toEqual({
        eventTimeStart: undefined,
        eventTimeEnd: undefined,
      });
    });
  });

  describe('when parameters are valid', () => {
    it('should return time range with ±30m window for valid alert', () => {
      const originalTime = '2025-01-15T10:00:00.000Z';
      const result = getEventTimeRangeForSingleAlert(true, originalTime);

      expect(result).toEqual({
        eventTimeStart: `${originalTime}||-30m`,
        eventTimeEnd: `${originalTime}||+30m`,
      });
    });

    it('should handle timestamps with milliseconds', () => {
      const originalTime = '2025-01-15T10:00:00.123Z';
      const result = getEventTimeRangeForSingleAlert(true, originalTime);

      expect(result).toEqual({
        eventTimeStart: `${originalTime}||-30m`,
        eventTimeEnd: `${originalTime}||+30m`,
      });
    });

    it('should handle different ISO timestamp formats', () => {
      const originalTime = '2025-01-15T10:00:00+00:00';
      const result = getEventTimeRangeForSingleAlert(true, originalTime);

      expect(result).toEqual({
        eventTimeStart: `${originalTime}||-30m`,
        eventTimeEnd: `${originalTime}||+30m`,
      });
    });
  });
});
