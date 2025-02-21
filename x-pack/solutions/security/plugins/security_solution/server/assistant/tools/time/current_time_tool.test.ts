/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { CurrentTimeToolParams } from './current_time_tool';
import { CURRENT_TIME_TOOL } from './current_time_tool';
import type { ScreenContext } from '@kbn/elastic-assistant-common';

describe('CurrentTimeTool', () => {
  const defaultArgs = {
    core: {
      uiSettings: {
        client: {
          get: jest.fn().mockResolvedValue('Browser'),
        },
      },
    },
  } as unknown as CurrentTimeToolParams;

  it('isSupported returns true when core is defined', () => {
    expect(CURRENT_TIME_TOOL.isSupported(defaultArgs)).toEqual(true);
  });

  it('isSupported return false when core is not defined', () => {
    expect(CURRENT_TIME_TOOL.isSupported({} as unknown as AssistantToolParams)).toEqual(false);
  });

  it('name', () => {
    expect(CURRENT_TIME_TOOL.name).toEqual('CurrentTimeTool');
  });

  it('description', () => {
    expect(CURRENT_TIME_TOOL.description).toContain(
      'Call this to get the current local time of the user'
    );
  });

  describe('tool', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest
        .useFakeTimers()
        .setSystemTime(new Date('Fri Feb 14 2025 07:33:12 GMT+0000 (Greenwich Mean Time)'));
    });

    it.each([
      // kibana settings timezone and no screen context timezone
      ['Browser', undefined, 'Current time: 14/02/2025, 07:33:12 GMT'],
      [undefined, undefined, 'Current time: 14/02/2025, 07:33:12 GMT'],
      [
        'Europe/Zurich',
        undefined,
        'Current time: 14/02/2025, 08:33:12 GMT+1 (14/02/2025, 07:33:12 GMT)',
      ],
      [
        'Europe/Warsaw',
        undefined,
        'Current time: 14/02/2025, 08:33:12 GMT+1 (14/02/2025, 07:33:12 GMT)',
      ],
      [
        'America/Denver',
        undefined,
        'Current time: 14/02/2025, 00:33:12 GMT-7 (14/02/2025, 07:33:12 GMT)',
      ],
      ['MST', undefined, 'Current time: 14/02/2025, 00:33:12 GMT-7 (14/02/2025, 07:33:12 GMT)'],
      [
        'America/Los_Angeles',
        undefined,
        'Current time: 13/02/2025, 23:33:12 GMT-8 (14/02/2025, 07:33:12 GMT)',
      ],

      // kibana settings timezone and screen context timezone
      [
        'Europe/Zurich',
        'America/Denver',
        'Current time: 14/02/2025, 08:33:12 GMT+1 (14/02/2025, 07:33:12 GMT)',
      ],
      [
        'Europe/Warsaw',
        'America/Denver',
        'Current time: 14/02/2025, 08:33:12 GMT+1 (14/02/2025, 07:33:12 GMT)',
      ],
      [
        'America/Denver',
        'Europe/Warsaw',
        'Current time: 14/02/2025, 00:33:12 GMT-7 (14/02/2025, 07:33:12 GMT)',
      ],
      ['MST', 'Europe/Warsaw', 'Current time: 14/02/2025, 00:33:12 GMT-7 (14/02/2025, 07:33:12 GMT)'],
      [
        'America/Los_Angeles',
        'Europe/Warsaw',
        'Current time: 13/02/2025, 23:33:12 GMT-8 (14/02/2025, 07:33:12 GMT)',
      ],

      // screen context timezone and Browser kibana setting timezone
      ['Browser', 'Europe/London', 'Current time: 14/02/2025, 07:33:12 GMT'],
      [
        'Browser',
        'Europe/Zurich',
        'Current time: 14/02/2025, 08:33:12 GMT+1 (14/02/2025, 07:33:12 GMT)',
      ],
      [
        'Browser',
        'Europe/Warsaw',
        'Current time: 14/02/2025, 08:33:12 GMT+1 (14/02/2025, 07:33:12 GMT)',
      ],
      [
        'Browser',
        'America/Denver',
        'Current time: 14/02/2025, 00:33:12 GMT-7 (14/02/2025, 07:33:12 GMT)',
      ],
      ['Browser', 'MST', 'Current time: 14/02/2025, 00:33:12 GMT-7 (14/02/2025, 07:33:12 GMT)'],
      [
        'Browser',
        'America/Los_Angeles',
        'Current time: 13/02/2025, 23:33:12 GMT-8 (14/02/2025, 07:33:12 GMT)',
      ],
    ])(
      'when timezone from kibana settings is "%s" and screenContext.timezone is "%s", then result is "%s"',
      async (
        kibanaSettingTimezone: string | undefined,
        screenContextTimezone: string | undefined,
        expectedResult: string
      ) => {
        defaultArgs.core.uiSettings.client.get = jest
          .fn()
          .mockImplementation(async (key: string) => {
            expect(key).toEqual('dateFormat:tz');
            return kibanaSettingTimezone;
          });

        const screenContext: Partial<ScreenContext> = { timeZone: screenContextTimezone };

        const result = await CURRENT_TIME_TOOL.getTool({ ...defaultArgs, screenContext })?.invoke(
          {}
        );
        expect(result).toEqual(expectedResult);
      }
    );
  });
});
