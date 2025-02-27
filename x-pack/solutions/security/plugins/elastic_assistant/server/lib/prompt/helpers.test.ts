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
      ['Browser', undefined, 'Current time: 14/02/2025, 07:33:12 UTC+00:00'],
      [undefined, undefined, 'Current time: 14/02/2025, 07:33:12 UTC+00:00'],
      [
        'Europe/Zurich',
        undefined,
        'Current time: 14/02/2025, 08:33:12 UTC+01:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],
      [
        'Europe/Warsaw',
        undefined,
        'Current time: 14/02/2025, 08:33:12 UTC+01:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],
      [
        'America/Denver',
        undefined,
        'Current time: 14/02/2025, 00:33:12 UTC-07:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],
      [
        'MST',
        undefined,
        'Current time: 14/02/2025, 00:33:12 UTC-07:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],
      [
        'America/Los_Angeles',
        undefined,
        'Current time: 13/02/2025, 23:33:12 UTC-08:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],

      // Custom kibana settings timezone and screen context timezone
      [
        'Europe/Zurich',
        'America/Denver',
        'Current time: 14/02/2025, 08:33:12 UTC+01:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],
      [
        'Europe/Warsaw',
        'America/Denver',
        'Current time: 14/02/2025, 08:33:12 UTC+01:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],
      [
        'America/Denver',
        'Europe/Warsaw',
        'Current time: 14/02/2025, 00:33:12 UTC-07:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],
      [
        'MST',
        'Europe/Warsaw',
        'Current time: 14/02/2025, 00:33:12 UTC-07:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],
      [
        'America/Los_Angeles',
        'Europe/Warsaw',
        'Current time: 13/02/2025, 23:33:12 UTC-08:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],

      // screen context timezone and Browser kibana setting timezone
      ['Browser', 'Europe/London', 'Current time: 14/02/2025, 07:33:12 UTC+00:00'],
      [
        'Browser',
        'Europe/Zurich',
        'Current time: 14/02/2025, 08:33:12 UTC+01:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],
      [
        'Browser',
        'Europe/Warsaw',
        'Current time: 14/02/2025, 08:33:12 UTC+01:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],
      [
        'Browser',
        'America/Denver',
        'Current time: 14/02/2025, 00:33:12 UTC-07:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],
      [
        'Browser',
        'MST',
        'Current time: 14/02/2025, 00:33:12 UTC-07:00 (14/02/2025, 07:33:12 UTC+00:00)',
      ],
      [
        'Browser',
        'America/Los_Angeles',
        'Current time: 13/02/2025, 23:33:12 UTC-08:00 (14/02/2025, 07:33:12 UTC+00:00)',
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
