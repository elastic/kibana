/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScheduledTriggerSchema } from '@kbn/workflows';
import type { z } from '@kbn/zod/v4';

interface ScheduleRow {
  schedulePreset?: string;
  cronExpression?: string;
  timezone?: string;
}

export type PresetScheduleResult =
  | { success: true; trigger: z.infer<typeof ScheduledTriggerSchema> }
  | { success: false; error: string };

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const invalidSchedule = (): PresetScheduleResult => ({
  success: false,
  error: 'Invalid hourly, daily or weekly schedule expression.',
});

/** Converts the preset expressions emitted by the automation form to calendar schedules. */
export const parsePresetSchedule = (row: ScheduleRow): PresetScheduleResult => {
  const { schedulePreset, cronExpression = '', timezone = 'UTC' } = row;
  if (!['hourly', 'daily', 'weekly'].includes(schedulePreset ?? '')) {
    return {
      success: false,
      error: 'Custom schedules are not supported. Select a schedule preset.',
    };
  }
  if (cronExpression.length > 100) return invalidSchedule();
  const fields = cronExpression.trim().split(/\s+/);
  const [minute, hour, day, month, weekday] = fields;
  if (fields.length !== 5 || day !== '*' || month !== '*') return invalidSchedule();
  if (!/^\d{1,2}$/.test(minute) || Number(minute) > 59) return invalidSchedule();

  let hours: number[];
  if (schedulePreset === 'hourly') {
    if (Number(minute) !== 0 || weekday !== '*') return invalidSchedule();
    if (hour === '*') {
      hours = HOURS;
    } else {
      if (!/^\d{1,2}-\d{1,2}$/.test(hour)) return invalidSchedule();
      const [start, end] = hour.split('-').map(Number);
      if (start >= end || end > 23) return invalidSchedule();
      hours = HOURS.filter((value) => value >= start && value <= end);
    }
  } else {
    if (!/^\d{1,2}$/.test(hour) || Number(hour) > 23) return invalidSchedule();
    hours = [Number(hour)];
  }

  const weekdays: Array<(typeof WEEKDAYS)[number]> = [];
  if (schedulePreset === 'weekly') {
    if (!/^[0-6](?:-[0-6])?(?:,[0-6](?:-[0-6])?)*$/.test(weekday)) return invalidSchedule();
    for (const part of weekday.split(',')) {
      const [start, end = start] = part.split('-').map(Number);
      if (start > end) return invalidSchedule();
      weekdays.push(...WEEKDAYS.filter((_value, index) => index >= start && index <= end));
    }
  } else if (weekday !== '*') {
    return invalidSchedule();
  }

  const result = ScheduledTriggerSchema.safeParse({
    type: 'scheduled',
    with: {
      rrule: {
        freq: schedulePreset === 'weekly' ? 'WEEKLY' : 'DAILY',
        interval: 1,
        tzid: timezone,
        byhour: hours,
        byminute: [Number(minute)],
        ...(weekdays.length ? { byweekday: [...new Set(weekdays)] } : {}),
      },
    },
  });
  return result.success
    ? { success: true, trigger: result.data }
    : { success: false, error: 'Invalid schedule timezone.' };
};
