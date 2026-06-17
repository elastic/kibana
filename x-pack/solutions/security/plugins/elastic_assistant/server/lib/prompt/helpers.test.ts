/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFormattedTime } from './helpers';

describe('helper', () => {
  describe('getCurrentTimeForPrompt', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest
        .useFakeTimers()
        .setSystemTime(new Date('Fri Feb 14 2025 07:33:12 UTC+0000 (Greenwich Mean Time)'));
    });

    it.each([
      // kibana settings timezone and no screen context timezone
      ['Browser', undefined, 'Current time: Fri, Feb 14, 2025 7:33 AM UTC+00:00'],
      [undefined, undefined, 'Current time: Fri, Feb 14, 2025 7:33 AM UTC+00:00'],
      [
        'Europe/Zurich',
        undefined,
        'Current time: Fri, Feb 14, 2025 8:33 AM UTC+01:00 (7:33 AM UTC)',
      ],
      [
        'Europe/Warsaw',
        undefined,
        'Current time: Fri, Feb 14, 2025 8:33 AM UTC+01:00 (7:33 AM UTC)',
      ],
      [
        'America/Denver',
        undefined,
        'Current time: Fri, Feb 14, 2025 12:33 AM UTC-07:00 (7:33 AM UTC)',
      ],
      ['MST', undefined, 'Current time: Fri, Feb 14, 2025 12:33 AM UTC-07:00 (7:33 AM UTC)'],
      [
        'America/Los_Angeles',
        undefined,
        'Current time: Thu, Feb 13, 2025 11:33 PM UTC-08:00 (7:33 AM UTC)',
      ],

      // Custom kibana settings timezone and screen context timezone
      [
        'Europe/Zurich',
        'America/Denver',
        'Current time: Fri, Feb 14, 2025 8:33 AM UTC+01:00 (7:33 AM UTC)',
      ],
      [
        'Europe/Warsaw',
        'America/Denver',
        'Current time: Fri, Feb 14, 2025 8:33 AM UTC+01:00 (7:33 AM UTC)',
      ],
      [
        'America/Denver',
        'Europe/Warsaw',
        'Current time: Fri, Feb 14, 2025 12:33 AM UTC-07:00 (7:33 AM UTC)',
      ],
      ['MST', 'Europe/Warsaw', 'Current time: Fri, Feb 14, 2025 12:33 AM UTC-07:00 (7:33 AM UTC)'],
      [
        'America/Los_Angeles',
        'Europe/Warsaw',
        'Current time: Thu, Feb 13, 2025 11:33 PM UTC-08:00 (7:33 AM UTC)',
      ],

      // screen context timezone and Browser kibana setting timezone
      ['Browser', 'Europe/London', 'Current time: Fri, Feb 14, 2025 7:33 AM UTC+00:00'],
      [
        'Browser',
        'Europe/Zurich',
        'Current time: Fri, Feb 14, 2025 8:33 AM UTC+01:00 (7:33 AM UTC)',
      ],
      [
        'Browser',
        'Europe/Warsaw',
        'Current time: Fri, Feb 14, 2025 8:33 AM UTC+01:00 (7:33 AM UTC)',
      ],
      [
        'Browser',
        'America/Denver',
        'Current time: Fri, Feb 14, 2025 12:33 AM UTC-07:00 (7:33 AM UTC)',
      ],
      ['Browser', 'MST', 'Current time: Fri, Feb 14, 2025 12:33 AM UTC-07:00 (7:33 AM UTC)'],
      [
        'Browser',
        'America/Los_Angeles',
        'Current time: Thu, Feb 13, 2025 11:33 PM UTC-08:00 (7:33 AM UTC)',
      ],
    ])(
      'when timezone from kibana settings is "%s" and screenContext.timezone is "%s", then result is "%s"',
      async (
        uiSettingsDateFormatTimezone: string | undefined,
        screenContextTimezone: string | undefined,
        expectedResult: string
      ) => {
        const result = getFormattedTime({
          screenContextTimezone,
          uiSettingsDateFormatTimezone,
        });

        expect(result).toEqual(expectedResult);
      }
    );
  });
});
