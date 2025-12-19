/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFindAttackDiscoverySchedules } from './use_find_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderQuery } from '../../../../../management/hooks/test_utils';
import { findAttackDiscoverySchedule } from '../api';
import type { FindAttackDiscoverySchedulesResponse } from '@kbn/elastic-assistant-common';

jest.mock('../api');
jest.mock('../../../../../common/hooks/use_app_toasts');

const findAttackDiscoveryScheduleMock = findAttackDiscoverySchedule as jest.MockedFunction<
  typeof findAttackDiscoverySchedule
>;

describe('useFindAttackDiscoverySchedules', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);

    // Mock data in camelCase format (internal API format)
    findAttackDiscoveryScheduleMock.mockResolvedValue({
      data: [
        {
          id: 'schedule-1',
          name: 'Test Schedule',
          createdBy: 'test-user',
          updatedBy: 'test-user',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          enabled: true,
          params: {
            alertsIndexPattern: 'test-*',
            apiConfig: {
              name: 'test-config',
              actionTypeId: 'test-action',
              connectorId: 'test-connector',
            },
            size: 100,
            query: { query: '*', language: 'kuery' },
            filters: [],
          },
          schedule: { interval: '1h' },
          actions: [],
        },
      ],
      total: 1,
    } as unknown as FindAttackDiscoverySchedulesResponse);
  });

  it('should invoke `findAttackDiscoverySchedule`', async () => {
    await renderQuery(() => useFindAttackDiscoverySchedules({ page: 1 }), 'isSuccess');

    expect(findAttackDiscoveryScheduleMock).toHaveBeenCalledWith({
      page: 1,
      signal: expect.anything(),
    });
  });

  it('should invoke `addError`', async () => {
    findAttackDiscoveryScheduleMock.mockRejectedValue('Royally failed!');

    await renderQuery(() => useFindAttackDiscoverySchedules({ page: 2 }), 'isError');

    expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
      title: 'Failed to fetch attack discovery schedules',
    });
  });
});
