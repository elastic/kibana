/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsMonitorSchedule } from '../runtime_types';
import { ScheduleUnit } from '../runtime_types';

export function scheduleToMilli(schedule: SyntheticsMonitorSchedule): number {
  const timeValue = parseInt(schedule.number, 10);
  return timeValue * getMilliFactorForScheduleUnit(schedule.unit);
}

export function scheduleToMinutes(schedule: SyntheticsMonitorSchedule): number {
  return Math.floor(scheduleToMilli(schedule) / (60 * 1000));
}

/**
 * Frequency filter values are unit-less `schedule.number` strings (minutes).
 * Ping documents store `monitor.interval` in seconds.
 */
export function scheduleFilterToMonitorIntervals(schedules?: string | string[]): number[] {
  if (!schedules) {
    return [];
  }
  const values = Array.isArray(schedules) ? schedules : [schedules];
  return values
    .map((value) => Number(value) * 60)
    .filter((interval) => Number.isFinite(interval) && interval > 0);
}

function getMilliFactorForScheduleUnit(scheduleUnit: ScheduleUnit): number {
  switch (scheduleUnit) {
    case ScheduleUnit.SECONDS:
      return 1000;
    case ScheduleUnit.MINUTES:
      return 60 * 1000;
    default:
      throw new Error(`Unit ${scheduleUnit} is not supported`);
  }
}
