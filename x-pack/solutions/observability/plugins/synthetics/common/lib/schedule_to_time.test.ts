/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsMonitorSchedule } from '../runtime_types';
import { ScheduleUnit } from '../runtime_types';
import { scheduleToMilli, scheduleToSeconds, withScheduleInterval } from './schedule_to_time';

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

  describe('scheduleToSeconds', () => {
    it('keeps seconds and converts minutes', () => {
      expect(scheduleToSeconds({ unit: ScheduleUnit.SECONDS, number: '10' })).toBe(10);
      expect(scheduleToSeconds({ unit: ScheduleUnit.MINUTES, number: '10' })).toBe(600);
      expect(scheduleToSeconds({ unit: ScheduleUnit.MINUTES, number: '5' })).toBe(300);
    });
  });

  describe('withScheduleInterval', () => {
    it('stores the duration beside the schedule', () => {
      expect(
        withScheduleInterval({
          name: 'login',
          schedule: { number: '10', unit: ScheduleUnit.SECONDS },
        })
      ).toEqual({
        name: 'login',
        schedule: { number: '10', unit: ScheduleUnit.SECONDS },
        schedule_interval_seconds: 10,
      });
    });

    it('treats a missing unit as minutes, like the backfill', () => {
      expect(withScheduleInterval({ name: 'login', schedule: { number: '3' } })).toEqual({
        name: 'login',
        schedule: { number: '3' },
        schedule_interval_seconds: 180,
      });
    });

    it('leaves attributes unchanged when there is no schedule', () => {
      expect(withScheduleInterval({ name: 'login' })).toEqual({ name: 'login' });
    });
  });
});
