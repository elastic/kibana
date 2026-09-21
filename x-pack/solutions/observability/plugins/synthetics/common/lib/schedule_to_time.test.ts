/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsMonitorSchedule } from '../runtime_types';
import { ScheduleUnit } from '../runtime_types';
import { scheduleFilterToMonitorIntervals, scheduleToMilli } from './schedule_to_time';

describe('schedule_to_time', () => {
  describe('scheduleToMilli', () => {
    it('converts seconds schedule to millis', () => {
      const schedule: SyntheticsMonitorSchedule = { unit: ScheduleUnit.SECONDS, number: '10' };
      expect(scheduleToMilli(schedule)).toEqual(10 * 1000);
    });

    it('converts minutes schedule to millis', () => {
      const schedule: SyntheticsMonitorSchedule = { unit: ScheduleUnit.MINUTES, number: '6' };
      expect(scheduleToMilli(schedule)).toEqual(6 * 60 * 1000);
    });
  });

  describe('scheduleFilterToMonitorIntervals', () => {
    it('converts minute schedule numbers to monitor.interval seconds', () => {
      expect(scheduleFilterToMonitorIntervals(['3', '10'])).toEqual([180, 600]);
    });

    it('accepts a single string value', () => {
      expect(scheduleFilterToMonitorIntervals('5')).toEqual([300]);
    });

    it('drops empty and non-numeric values', () => {
      expect(scheduleFilterToMonitorIntervals(undefined)).toEqual([]);
      expect(scheduleFilterToMonitorIntervals([])).toEqual([]);
      expect(scheduleFilterToMonitorIntervals(['daily', '0', '-1'])).toEqual([]);
    });
  });
});
