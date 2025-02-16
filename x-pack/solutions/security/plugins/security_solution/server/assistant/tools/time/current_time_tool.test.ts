/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import type { CurrentTimeToolParams } from './current_time_tool';
import { CURRENT_TIME_TOOL } from './current_time_tool';

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
        .setSystemTime(new Date('Fri Feb 14 2025 09:33:12 GMT+0000 (Greenwich Mean Time)'));
    });

    it.each([
      ['Browser', 'Local time: 14/02/2025, 09:33:12 UTC'],
      [undefined, 'Local time: 14/02/2025, 09:33:12 UTC'],
      ['Europe/Zurich', 'Local time: 14/02/2025, 10:33:12 CET (14/02/2025, 09:33:12 UTC)'],
      ['Europe/Warsaw', 'Local time: 14/02/2025, 10:33:12 CET (14/02/2025, 09:33:12 UTC)'],
      ['America/Denver', 'Local time: 14/02/2025, 02:33:12 GMT-7 (14/02/2025, 09:33:12 UTC)'],
      ['MST', 'Local time: 14/02/2025, 02:33:12 GMT-7 (14/02/2025, 09:33:12 UTC)'],
      ['America/Los_Angeles', 'Local time: 14/02/2025, 01:33:12 GMT-8 (14/02/2025, 09:33:12 UTC)'],
    ])(
      'gets correct time if dateFormat:tz is %s',
      async (timezone: string | undefined, expectedResult: string) => {
        defaultArgs.core.uiSettings.client.get = jest
          .fn()
          .mockImplementation(async (key: string) => {
            expect(key).toEqual('dateFormat:tz');
            return timezone;
          });

        const result = await CURRENT_TIME_TOOL.getTool(defaultArgs)?.invoke({});
        expect(result).toEqual(expectedResult);
      }
    );
  });
});
