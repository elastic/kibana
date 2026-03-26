/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseAttacksVolumeData, getInterval } from './helpers';

describe('helpers', () => {
  describe('parseAttacksVolumeData', () => {
    const interval = 3600000; // 1 hour
    // Ensure start is aligned to the interval to match binning logic
    const rawStart = 1600000000000;
    const start = rawStart - (rawStart % interval);
    const end = start + interval * 3;

    it('correctly bins timestamps and deduplicates within bins', () => {
      const attackStartTimes = {
        '1': start + 1000,
        '2': start + 2000,
        '3': start + interval + 100,
      };

      const result = parseAttacksVolumeData({
        attackStartTimes,
        intervalMs: interval,
        min: start,
        max: end,
      });

      // Bin 1 (start): 2 unique attacks (keys '1' and '2')
      // Bin 2 (start+interval): 1 unique attack (key '3')
      // Bin 3: 0
      // Bin 4: 0

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ x: start, y: 2 });
      expect(result[1]).toEqual({ x: start + interval, y: 1 });
      expect(result[2]).toEqual({ x: start + interval * 2, y: 0 });
      expect(result[3]).toEqual({ x: start + interval * 3, y: 0 });
    });

    it('handles empty data', () => {
      const result = parseAttacksVolumeData({
        attackStartTimes: {},
        intervalMs: interval,
        min: start,
        max: end,
      });
      expect(result).toHaveLength(4);
      result.forEach((point) => expect(point.y).toBe(0));
    });

    it('extends range to include earliest start time', () => {
      const earlyStart = start - interval * 2;
      const attackStartTimes = {
        '1': earlyStart + 1000,
      };

      const result = parseAttacksVolumeData({
        attackStartTimes,
        intervalMs: interval,
        min: start,
        max: end,
      });
      const point = result.find((p) => p.x === Math.floor(earlyStart / interval) * interval);
      expect(point?.y).toBe(1);

      // Range should cover from earlyStart to end
      // earlyStart (aligned), earlyStart+interval, start, start+interval, start+2interval, start+3interval
      expect(result.length).toBe(6);
    });

    it('extends range to include latest start time if after max', () => {
      const lateStart = end + interval * 2;
      const attackStartTimes = {
        '1': lateStart + 1000,
      };

      const result = parseAttacksVolumeData({
        attackStartTimes,
        intervalMs: interval,
        min: start,
        max: end,
      });
      const point = result.find((p) => p.x === Math.floor(lateStart / interval) * interval);
      expect(point?.y).toBe(1);

      // Range should cover from start to lateStart
      // start, start+1, start+2, start+3(end), start+4, start+5(lateStart)
      expect(result.length).toBe(6);
    });
  });

  describe('getInterval', () => {
    const hour = 3600 * 1000;
    const day = 24 * hour;

    it('returns hour if diff <= 24 hours', () => {
      expect(getInterval(0, 24 * hour)).toBe(hour);
      expect(getInterval(0, 23 * hour)).toBe(hour);
    });

    it('returns day if diff <= 30 days', () => {
      expect(getInterval(0, 25 * hour)).toBe(day);
      expect(getInterval(0, 30 * day)).toBe(day);
    });

    it('returns day if diff > 30 days', () => {
      expect(getInterval(0, 31 * day)).toBe(day);
    });
  });
});
