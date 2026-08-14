/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/task-manager-plugin/server';
import { cadenceToRrule } from './cadence_to_rrule';

describe('cadenceToRrule', () => {
  it('maps weekly and monthly presets', () => {
    expect(cadenceToRrule('weekly').rrule).toEqual(
      expect.objectContaining({
        freq: Frequency.WEEKLY,
        interval: 1,
        byweekday: ['MO'],
        byhour: [8],
      })
    );
    expect(cadenceToRrule('biweekly').rrule.interval).toBe(2);
    expect(cadenceToRrule('monthly').rrule.freq).toBe(Frequency.MONTHLY);
  });

  it('maps daily, weekdays, and a custom Friday evening', () => {
    expect(cadenceToRrule({ cadence: 'daily', hour: 7, minute: 30, tzid: 'UTC' }).rrule).toEqual(
      expect.objectContaining({
        freq: Frequency.DAILY,
        byhour: [7],
        byminute: [30],
      })
    );
    expect(cadenceToRrule({ cadence: 'weekdays' }).rrule.byweekday).toEqual([
      'MO',
      'TU',
      'WE',
      'TH',
      'FR',
    ]);
    expect(
      cadenceToRrule({
        cadence: 'weekly',
        weekday: 'FR',
        hour: 17,
        minute: 0,
        tzid: 'Europe/Berlin',
      }).rrule
    ).toEqual(
      expect.objectContaining({
        freq: Frequency.WEEKLY,
        byweekday: ['FR'],
        byhour: [17],
        tzid: 'Europe/Berlin',
      })
    );
  });
});
