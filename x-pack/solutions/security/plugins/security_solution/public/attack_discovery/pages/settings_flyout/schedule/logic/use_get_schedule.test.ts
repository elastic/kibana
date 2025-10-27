/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useGetAttackDiscoverySchedule } from './use_get_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderQuery } from '../../../../../management/hooks/test_utils';
import { getAttackDiscoverySchedule } from '../api';
import type { AttackDiscoveryApiSchedule } from '@kbn/elastic-assistant-common';

jest.mock('../api');
jest.mock('../../../../../common/hooks/use_app_toasts');

const mockUseKibanaFeatureFlags = jest
  .fn()
  .mockReturnValue({ attackDiscoveryPublicApiEnabled: false });
jest.mock('../../../use_kibana_feature_flags', () => ({
  useKibanaFeatureFlags: () => mockUseKibanaFeatureFlags(),
}));

const getAttackDiscoveryScheduleMock = getAttackDiscoverySchedule as jest.MockedFunction<
  typeof getAttackDiscoverySchedule
>;

describe('useGetAttackDiscoverySchedule', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);

    // Mock data in camelCase format (internal API format)
    // Since attackDiscoveryPublicApiEnabled: false, internal API should return camelCase
    // Note: API function is incorrectly typed, so we need to cast to unknown first to avoid any rule
    getAttackDiscoveryScheduleMock.mockResolvedValue({
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
    } as unknown as AttackDiscoveryApiSchedule);
  });

  it('should invoke `getAttackDiscoverySchedule`', async () => {
    await renderQuery(() => useGetAttackDiscoverySchedule({ id: 'test-1' }), 'isSuccess');

    expect(getAttackDiscoveryScheduleMock).toHaveBeenCalledWith({
      attackDiscoveryPublicApiEnabled: false,
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
