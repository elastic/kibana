/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency, RRule } from '@kbn/rrule';
import { parseCronExpression } from './cron_schedule';
import { parseAutomationSchedule } from './automation_schedule';

const calendar = (expression: string) => {
  const result = parseCronExpression(expression);
  if (!result.success) throw new Error(result.error);
  return result.calendar;
};

describe('custom Cron schedules', () => {
  it('expands steps within fields, ranges, lists and Sunday aliases', () => {
    expect(calendar('*/20 9-17/4 * * 0,1-3,7')).toEqual({
      freq: 'WEEKLY',
      interval: 1,
      byhour: [9, 13, 17],
      byminute: [0, 20, 40],
      byweekday: ['SU', 'MO', 'TU', 'WE'],
    });
    expect(calendar('5/20 0,23 * * *')).toMatchObject({
      freq: 'DAILY',
      byminute: [5, 25, 45],
      byhour: [0, 23],
    });
  });

  it.each([
    '',
    '* * * *',
    '* * * * * *',
    '@daily',
    '0 9 * JAN *',
    '0 9 * * MON',
    '60 9 * * *',
    '0 24 * * *',
    '0 9 0 * *',
    '0 9 32 * *',
    '0 9 * * 8',
    '*/0 * * * *',
    '1-0 * * * *',
    '-1 * * * *',
    '1,,2 * * * *',
    '1/2/3 * * * *',
    '0 9 ? * *',
    '0 9 L * *',
    '0 9 * * 1#2',
    '0 9 * 1 *',
    '0 9 1 * 1',
    '0 9 */1 * 1',
    '0'.repeat(257),
  ])('rejects invalid or unsupported expressions: %s', (expression) => {
    expect(parseCronExpression(expression).success).toBe(false);
  });

  it('skips months without the selected day', () => {
    const rule = new RRule({
      ...calendar('0 9 31 * *'),
      freq: Frequency.MONTHLY,
      tzid: 'UTC',
      dtstart: new Date('2026-01-31T00:00:00Z'),
    });
    expect(rule.after(new Date('2026-02-01T00:00:00Z'))?.toISOString()).toBe(
      '2026-03-31T09:00:00.000Z'
    );
  });

  it.each([
    ['2026-03-28T00:00:00Z', '2026-03-28T08:30:00.000Z', '2026-03-29T07:30:00.000Z'],
    ['2026-10-24T00:00:00Z', '2026-10-24T07:30:00.000Z', '2026-10-25T08:30:00.000Z'],
  ])('preserves local wall-clock time across DST from %s', (start, first, next) => {
    const rule = new RRule({
      ...calendar('30 9 * * *'),
      freq: Frequency.DAILY,
      tzid: 'Europe/Berlin',
      dtstart: new Date(start),
    });
    expect(rule.after(new Date(start))?.toISOString()).toBe(first);
    expect(rule.after(new Date(new Date(first).getTime() + 1))?.toISOString()).toBe(next);
  });

  it.each([
    ['2026-03-28T01:30:00Z', '2026-03-29T00:30:00.000Z'],
    ['2026-03-29T01:00:00Z', '2026-03-29T01:30:00.000Z'],
    ['2026-10-24T00:30:00Z', '2026-10-25T00:30:00.000Z'],
    ['2026-10-25T01:00:00Z', '2026-10-25T01:30:00.000Z'],
  ])(
    'uses RRULE normalization for missing/repeated hours calculated from %s',
    (start, expected) => {
      const rule = new RRule({
        ...calendar('30 2 * * *'),
        freq: Frequency.DAILY,
        tzid: 'Europe/Berlin',
        dtstart: new Date(start),
      });
      expect(rule.after(new Date(new Date(start).getTime() + 1))?.toISOString()).toBe(expected);
    }
  );

  it.each(['UTC', 'Europe/Berlin', 'Asia/Kolkata'])(
    'passes timezone %s through to the workflow',
    (timezone) => {
      const result = parseAutomationSchedule({
        schedulePreset: 'custom',
        cronExpression: '0 9 * * *',
        timezone,
      });
      expect(result).toMatchObject({
        success: true,
        trigger: { with: { rrule: { tzid: timezone } } },
      });
    }
  );

  it('rejects invalid timezones and defaults an omitted timezone to UTC', () => {
    const schedule = { schedulePreset: 'custom', cronExpression: '* * * * *' };
    expect(parseAutomationSchedule({ ...schedule, timezone: 'Not/AZone' }).success).toBe(false);
    expect(parseAutomationSchedule(schedule)).toMatchObject({
      success: true,
      trigger: { with: { rrule: { tzid: 'UTC' } } },
    });
  });
});
