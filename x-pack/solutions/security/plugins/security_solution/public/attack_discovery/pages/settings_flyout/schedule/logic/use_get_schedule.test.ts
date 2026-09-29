/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked, MockedFunction } from 'vitest';

import type { AttackDiscoveryApiSchedule } from '@kbn/elastic-assistant-common';
import { useGetAttackDiscoverySchedule } from './use_get_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderQuery } from '../../../../../management/hooks/test_utils';
import { getAttackDiscoverySchedule } from '../api';

vi.mock('../api');
vi.mock('../../../../../common/hooks/use_app_toasts');

const getAttackDiscoveryScheduleMock = getAttackDiscoverySchedule as MockedFunction<
  typeof getAttackDiscoverySchedule
>;

describe('useGetAttackDiscoverySchedule', () => {
  let appToastsMock: Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    vi.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as Mock).mockReturnValue(appToastsMock);

    // Mock API response in snake_case format (will be transformed by the hook)
    const mockApiResponse: AttackDiscoveryApiSchedule = {
      id: 'schedule-1',
      name: 'Test Schedule',
      created_by: 'test-user',
      updated_by: 'test-user',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      enabled: true,
      params: {
        alerts_index_pattern: 'test-*',
        api_config: {
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
    };

    getAttackDiscoveryScheduleMock.mockResolvedValue(mockApiResponse);
  });

  it('should invoke `getAttackDiscoverySchedule`', async () => {
    await renderQuery(() => useGetAttackDiscoverySchedule({ id: 'test-1' }), 'isSuccess');

    expect(getAttackDiscoveryScheduleMock).toHaveBeenCalledWith({
      id: 'test-1',
      signal: expect.anything(),
    });
  });

  it('should invoke `addError`', async () => {
    getAttackDiscoveryScheduleMock.mockRejectedValue('Royally failed!');

    await renderQuery(() => useGetAttackDiscoverySchedule({ id: 'test-2' }), 'isError');

    expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
      title: 'Failed to fetch attack discovery schedule',
    });
  });
});
