/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScheduledTriggerSchema } from '@kbn/workflows';
import { lazySchema, z } from '@kbn/zod/v4';

export const presetScheduleSchema = lazySchema(() => {
  const timezone = z.string().max(100).optional();
  const time = z
    .string()
    .max(5)
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/);
  return z.discriminatedUnion('schedulePreset', [
    z.object({
      schedulePreset: z.literal('hourly'),
      hourWindow: z
        .object({
          start: z.number().int().min(0).max(23),
          end: z.number().int().min(0).max(23),
        })
        .refine(({ start, end }) => start < end, 'The hourly window must start before it ends.')
        .optional(),
      timezone,
    }),
    z.object({ schedulePreset: z.literal('daily'), time, timezone }),
    z.object({
      schedulePreset: z.literal('weekly'),
      time,
      daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7),
      timezone,
    }),
  ]);
});

export type PresetSchedule = z.infer<typeof presetScheduleSchema>;

export type PresetScheduleResult =
  | { success: true; schedule: PresetSchedule; trigger: z.infer<typeof ScheduledTriggerSchema> }
  | { success: false; error: string };

const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/** Validates structured presets and converts them directly to calendar schedules. */
export const parsePresetSchedule = (row: object): PresetScheduleResult => {
  const parsed = presetScheduleSchema.safeParse(row);
  if (!parsed.success) return { success: false, error: parsed.error.message };
  const schedule = parsed.data;
  const hours =
    schedule.schedulePreset === 'hourly'
      ? HOURS.filter(
          (hour) =>
            !schedule.hourWindow ||
            (hour >= schedule.hourWindow.start && hour <= schedule.hourWindow.end)
        )
      : [Number(schedule.time.slice(0, 2))];
  const minute = schedule.schedulePreset === 'hourly' ? 0 : Number(schedule.time.slice(3, 5));

  const result = ScheduledTriggerSchema.safeParse({
    type: 'scheduled',
    with: {
      rrule: {
        freq: schedule.schedulePreset === 'weekly' ? 'WEEKLY' : 'DAILY',
        interval: 1,
        tzid: schedule.timezone ?? 'UTC',
        byhour: hours,
        byminute: [minute],
        ...(schedule.schedulePreset === 'weekly'
          ? { byweekday: [...new Set(schedule.daysOfWeek)].map((day) => WEEKDAYS[day]) }
          : {}),
      },
    },
  });
  return result.success
    ? { success: true, schedule, trigger: result.data }
    : { success: false, error: 'Invalid schedule timezone.' };
};
