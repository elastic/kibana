/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscoverySchedule } from '@kbn/discoveries-schemas';

import { useGetWorkflowSchedule } from './use_get_workflow_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderQuery } from '../../../../../management/hooks/test_utils';
import { getWorkflowSchedule } from '../api/internal';

jest.mock('../api/internal');
jest.mock('../../../../../common/hooks/use_app_toasts');

const getWorkflowScheduleMock = getWorkflowSchedule as jest.MockedFunction<
  typeof getWorkflowSchedule
>;

const mockApiResponse: AttackDiscoverySchedule = {
  id: 'schedule-1',
  name: 'Test Workflow Schedule',
  created_by: 'test-user',
  updated_by: 'test-user',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  enabled: true,
  params: {
    alerts_index_pattern: 'test-*',
    api_config: {
      action_type_id: 'test-action',
      connector_id: 'test-connector',
      name: 'test-config',
    },
    size: 100,
  },
  schedule: { interval: '1h' },
  actions: [],
};

describe('useGetWorkflowSchedule', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);

    getWorkflowScheduleMock.mockResolvedValue(mockApiResponse);
  });

  it('invokes `getWorkflowSchedule` with the correct id', async () => {
    await renderQuery(() => useGetWorkflowSchedule({ id: 'test-1' }), 'isSuccess');

    expect(getWorkflowScheduleMock).toHaveBeenCalledWith({
      id: 'test-1',
      signal: expect.anything(),
    });
  });

  it('transforms the response into AttackDiscoverySchedule format', async () => {
    const result = await renderQuery(
      () => useGetWorkflowSchedule({ id: 'schedule-1' }),
      'isSuccess'
    );

    expect(result.data).toEqual({
      schedule: expect.objectContaining({
        id: 'schedule-1',
        name: 'Test Workflow Schedule',
        createdBy: 'test-user',
        updatedBy: 'test-user',
        enabled: true,
        params: expect.objectContaining({
          alertsIndexPattern: 'test-*',
          apiConfig: expect.objectContaining({
            actionTypeId: 'test-action',
            connectorId: 'test-connector',
          }),
        }),
      }),
    });
  });

  it('invokes `addError` on failure', async () => {
    getWorkflowScheduleMock.mockRejectedValue('Royally failed!');

    await renderQuery(() => useGetWorkflowSchedule({ id: 'test-2' }), 'isError');

    expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
      title: 'Failed to fetch attack discovery schedule',
    });
  });
});
