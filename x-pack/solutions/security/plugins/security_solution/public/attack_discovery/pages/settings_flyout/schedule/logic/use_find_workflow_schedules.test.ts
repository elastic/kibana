/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindAttackDiscoverySchedulesResponse } from '@kbn/discoveries-schemas';

import { useFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderQuery } from '../../../../../management/hooks/test_utils';
import { findWorkflowSchedules } from '../api/internal';

jest.mock('../api/internal');
jest.mock('../../../../../common/hooks/use_app_toasts');

const findWorkflowSchedulesMock = findWorkflowSchedules as jest.MockedFunction<
  typeof findWorkflowSchedules
>;

const mockFindResponse: FindAttackDiscoverySchedulesResponse = {
  page: 1,
  per_page: 10,
  total: 1,
  data: [
    {
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
    },
  ],
};

describe('useFindWorkflowSchedules', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);

    findWorkflowSchedulesMock.mockResolvedValue(mockFindResponse);
  });

  it('invokes `findWorkflowSchedules` with the correct params', async () => {
    await renderQuery(() => useFindWorkflowSchedules({ page: 1 }), 'isSuccess');

    expect(findWorkflowSchedulesMock).toHaveBeenCalledWith({
      page: 1,
      signal: expect.anything(),
    });
  });

  it('transforms the response into AttackDiscoverySchedule format', async () => {
    const result = await renderQuery(() => useFindWorkflowSchedules({ page: 1 }), 'isSuccess');

    expect(result.data).toEqual({
      schedules: [
        expect.objectContaining({
          id: 'schedule-1',
          name: 'Test Workflow Schedule',
          createdBy: 'test-user',
          updatedBy: 'test-user',
          enabled: true,
        }),
      ],
      total: 1,
    });
  });

  it('invokes `addError` on failure', async () => {
    findWorkflowSchedulesMock.mockRejectedValue('Royally failed!');

    await renderQuery(() => useFindWorkflowSchedules({ page: 2 }), 'isError');

    expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
      title: 'Failed to fetch attack discovery schedules',
    });
  });

  it('does not invoke `addError` when disableToast is true', async () => {
    findWorkflowSchedulesMock.mockRejectedValue('Royally failed!');

    await renderQuery(() => useFindWorkflowSchedules({ page: 3, disableToast: true }), 'isError');

    expect(appToastsMock.addError).not.toHaveBeenCalled();
  });
});
