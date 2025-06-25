/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getElapsedTimeText } from './elapsed_timestamp_tooltip';

jest.mock('@kbn/i18n', () => ({
  i18n: {
    translate: (_id: string, { defaultMessage, values }: any) => {
      if (values) {
        return defaultMessage
          .replace(
            '{day, plural, one {# day} other {# days}}',
            `${values.day} day${values.day === 1 ? '' : 's'}`
          )
          .replace(
            '{hour, plural, one {# hour} other {# hours}}',
            `${values.hour} hour${values.hour === 1 ? '' : 's'}`
          )
          .replace(
            '{minute, plural, one {# minute} other {# minutes}}',
            `${values.minute} minute${values.minute === 1 ? '' : 's'}`
          )
          .replace(
            '{hour, plural, one {# hour} other {# hours}}, {minute, plural, one {# minute} other {# minutes}}',
            `${values.hour} hour${values.hour === 1 ? '' : 's'}, ${values.minute} minute${
              values.minute === 1 ? '' : 's'
            }`
          );
      }
      return defaultMessage;
    },
  },
}));

describe('getElapsedTimeText', () => {
  it('returns days if duration has days', () => {
    const duration = moment.duration({ days: 2, hours: 0, minutes: 0 });
    expect(getElapsedTimeText(duration)).toContain('2 days');
  });

  it('returns hours if duration has hours and no minutes', () => {
    const duration = moment.duration({ days: 0, hours: 3, minutes: 0 });
    expect(getElapsedTimeText(duration)).toContain('3 hours');
  });

  it('returns hours and minutes if duration has both', () => {
    const duration = moment.duration({ days: 0, hours: 1, minutes: 15 });
    expect(getElapsedTimeText(duration)).toContain('1 hour, 15 minutes');
  });

  it('returns minutes if duration has only minutes', () => {
    const duration = moment.duration({ days: 0, hours: 0, minutes: 5 });
    expect(getElapsedTimeText(duration)).toContain('5 minutes');
  });

  it('returns "a few seconds ago" if duration is less than a minute', () => {
    const duration = moment.duration({ days: 0, hours: 0, minutes: 0, seconds: 30 });
    expect(getElapsedTimeText(duration)).toBe('a few seconds ago');
  });
});
