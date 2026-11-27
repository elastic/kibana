/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeSchedule, getDefaultScheduleName, isValidEmail } from './describe_schedule';

describe('describeSchedule', () => {
  it('formats daily, weekly, and monthly schedules', () => {
    expect(
      describeSchedule({
        frequency: 'DAILY',
        hour: 8,
        minute: 5,
        timeZone: 'America/New_York',
      })
    ).toBe('Daily at 08:05 America/New_York');

    expect(
      describeSchedule({
        frequency: 'WEEKLY',
        weekday: 'FR',
        hour: 14,
        minute: 30,
        timeZone: 'UTC',
      })
    ).toBe('Weekly on Fri at 14:30 UTC');

    expect(
      describeSchedule({
        frequency: 'MONTHLY',
        monthday: 15,
        hour: 9,
        minute: 0,
        timeZone: 'Europe/Berlin',
      })
    ).toBe('Monthly on day 15 at 09:00 Europe/Berlin');
  });

  it('builds a default schedule name with or without an environment', () => {
    expect(getDefaultScheduleName('shop')).toBe('Weekly scorecard: shop');
    expect(getDefaultScheduleName('shop', 'production')).toBe(
      'Weekly scorecard: shop (production)'
    );
  });

  it('validates email format', () => {
    expect(isValidEmail('team@example.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });
});
