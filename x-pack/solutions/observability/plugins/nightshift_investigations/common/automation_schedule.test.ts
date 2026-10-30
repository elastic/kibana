/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency, RRule } from '@kbn/rrule';
import { parsePresetSchedule } from './automation_schedule';

const parse = (schedule: object) => {
  const result = parsePresetSchedule(schedule);
  if (!result.success || !('rrule' in result.trigger.with)) throw new Error('Expected an RRULE');
  return result.trigger.with.rrule;
};

describe('preset schedules', () => {
  it('runs hourly on the hour rather than relative to the save time', () => {
    expect(parse({ schedulePreset: 'hourly' })).toEqual({
      freq: 'DAILY',
      interval: 1,
      tzid: 'UTC',
      byhour: Array.from({ length: 24 }, (_, hour) => hour),
      byminute: [0],
    });
  });

  it('preserves inclusive hourly windows and local timezones', () => {
    expect(
      parse({
        schedulePreset: 'hourly',
        hourWindow: { start: 9, end: 17 },
        timezone: 'Asia/Kolkata',
      })
    ).toEqual({
      freq: 'DAILY',
      interval: 1,
      tzid: 'Asia/Kolkata',
      byhour: [9, 10, 11, 12, 13, 14, 15, 16, 17],
      byminute: [0],
    });
  });

  it('converts selected weekdays, including Sunday, without duplicates', () => {
    expect(
      parse({ schedulePreset: 'weekly', time: '09:30', daysOfWeek: [0, 1, 2, 3, 5, 1] })
    ).toEqual({
      freq: 'WEEKLY',
      interval: 1,
      tzid: 'UTC',
      byhour: [9],
      byminute: [30],
      byweekday: ['SU', 'MO', 'TU', 'WE', 'FR'],
    });
  });

  it.each([
    ['2026-03-28T00:00:00Z', '2026-03-28T08:30:00.000Z', '2026-03-29T07:30:00.000Z'],
    ['2026-10-24T00:00:00Z', '2026-10-24T07:30:00.000Z', '2026-10-25T08:30:00.000Z'],
  ])('keeps 09:30 Berlin local time across DST from %s', (start, first, second) => {
    const rule = new RRule({
      ...parse({ schedulePreset: 'daily', time: '09:30', timezone: 'Europe/Berlin' }),
      freq: Frequency.DAILY,
      dtstart: new Date(start),
    });
    expect(rule.after(new Date(start))?.toISOString()).toBe(first);
    expect(rule.after(new Date(new Date(first).getTime() + 1))?.toISOString()).toBe(second);
  });

  it.each([
    { schedulePreset: 'custom' },
    { schedulePreset: 'daily' },
    { schedulePreset: 'daily', time: '09:60' },
    { schedulePreset: 'daily', time: '24:00' },
    { schedulePreset: 'daily', time: '9:00' },
    { schedulePreset: 'daily', time: 'bad' },
    { schedulePreset: 'hourly', hourWindow: { start: 17, end: 9 } },
    { schedulePreset: 'hourly', hourWindow: { start: 9, end: 9 } },
    { schedulePreset: 'hourly', hourWindow: { start: 9, end: 24 } },
    { schedulePreset: 'hourly', hourWindow: { start: -1, end: 17 } },
    { schedulePreset: 'hourly', hourWindow: { start: 9.5, end: 17 } },
    { schedulePreset: 'weekly', time: '09:00' },
    { schedulePreset: 'weekly', time: '09:00', daysOfWeek: [] },
    { schedulePreset: 'weekly', time: '09:00', daysOfWeek: [7] },
    { schedulePreset: 'weekly', time: '09:00', daysOfWeek: [-1] },
    { schedulePreset: 'weekly', time: '09:00', daysOfWeek: [1.5] },
    { schedulePreset: 'weekly', time: '09:00', daysOfWeek: Array(8).fill(1) },
    { schedulePreset: '' },
  ])('rejects unsupported or invalid schedules: %j', (schedule) => {
    expect(parsePresetSchedule(schedule).success).toBe(false);
  });

  it('rejects a timezone the scheduler does not accept', () => {
    expect(
      parsePresetSchedule({
        schedulePreset: 'daily',
        time: '09:00',
        timezone: 'Not/AZone',
      }).success
    ).toBe(false);
  });
});
