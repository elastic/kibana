/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency, RRule } from '@kbn/rrule';
import { parsePresetSchedule } from './automation_schedule';

const parse = (schedulePreset: string, cronExpression: string, timezone = 'UTC') => {
  const result = parsePresetSchedule({ schedulePreset, cronExpression, timezone });
  if (!result.success || !('rrule' in result.trigger.with)) throw new Error('Expected an RRULE');
  return result.trigger.with.rrule;
};

describe('preset schedules', () => {
  it('runs hourly on the hour rather than relative to the save time', () => {
    expect(parse('hourly', '0 * * * *')).toEqual({
      freq: 'DAILY',
      interval: 1,
      tzid: 'UTC',
      byhour: Array.from({ length: 24 }, (_, hour) => hour),
      byminute: [0],
    });
  });

  it('preserves inclusive hourly windows and local timezones', () => {
    expect(parse('hourly', '0 9-17 * * *', 'Asia/Kolkata')).toEqual({
      freq: 'DAILY',
      interval: 1,
      tzid: 'Asia/Kolkata',
      byhour: [9, 10, 11, 12, 13, 14, 15, 16, 17],
      byminute: [0],
    });
  });

  it('converts weekly lists and ranges, including Sunday', () => {
    expect(parse('weekly', '30 9 * * 0,1-3,5')).toEqual({
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
      ...parse('daily', '30 9 * * *', 'Europe/Berlin'),
      freq: Frequency.DAILY,
      dtstart: new Date(start),
    });
    expect(rule.after(new Date(start))?.toISOString()).toBe(first);
    expect(rule.after(new Date(new Date(first).getTime() + 1))?.toISOString()).toBe(second);
  });

  it.each([
    ['custom', '0 9 * * *'],
    ['daily', '60 9 * * *'],
    ['daily', '0 24 * * *'],
    ['daily', '0 9 1 * *'],
    ['daily', '0 9 * 1 *'],
    ['daily', '0 9 * * 1'],
    ['hourly', '30 * * * *'],
    ['hourly', '0 17-9 * * *'],
    ['hourly', '0 9-9 * * *'],
    ['hourly', '0 9-24 * * *'],
    ['weekly', '0 9 * * *'],
    ['weekly', '0 9 * * 7'],
    ['weekly', '0 9 * * 5-1'],
    ['weekly', '0 9 * *'],
    ['weekly', '*/15 9 * * 1'],
    ['daily', 'bad'],
    ['', '0 9 * * *'],
  ])('rejects unsupported or invalid %s expression %s', (schedulePreset, cronExpression) => {
    expect(parsePresetSchedule({ schedulePreset, cronExpression }).success).toBe(false);
  });

  it('rejects a timezone the scheduler does not accept', () => {
    expect(
      parsePresetSchedule({
        schedulePreset: 'daily',
        cronExpression: '0 9 * * *',
        timezone: 'Not/AZone',
      }).success
    ).toBe(false);
  });
});
