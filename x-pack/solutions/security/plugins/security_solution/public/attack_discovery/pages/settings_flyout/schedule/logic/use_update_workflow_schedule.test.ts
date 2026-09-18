/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import { useQueryClient } from '@kbn/react-query';
import type {
  AttackDiscoverySchedule,
  AttackDiscoveryScheduleUpdateProps,
} from '@kbn/discoveries-schemas';

import { useUpdateWorkflowSchedule } from './use_update_workflow_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderMutation } from '../../../../../management/hooks/test_utils';
import { useInvalidateFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useInvalidateGetWorkflowSchedule } from './use_get_workflow_schedule';
import { updateWorkflowSchedule } from '../api/internal';

jest.mock('@kbn/react-query', () => ({
  ...jest.requireActual('@kbn/react-query'),
  useQueryClient: jest.fn(),
}));
jest.mock('./use_find_workflow_schedules');
jest.mock('./use_get_workflow_schedule');
jest.mock('../api/internal', () => ({
  ...jest.requireActual('../api/internal'),
  updateWorkflowSchedule: jest.fn(),
}));
jest.mock('../../../../../common/hooks/use_app_toasts');

const updateWorkflowScheduleMock = updateWorkflowSchedule as jest.MockedFunction<
  typeof updateWorkflowSchedule
>;

const setQueryDataMock = jest.fn();
const useQueryClientMock = useQueryClient as jest.MockedFunction<typeof useQueryClient>;

const invalidateFindWorkflowSchedulesMock = jest.fn();
const mockUseInvalidateFindWorkflowSchedules =
  useInvalidateFindWorkflowSchedules as jest.MockedFunction<
    typeof useInvalidateFindWorkflowSchedules
  >;

const invalidateGetWorkflowScheduleMock = jest.fn();
const mockUseInvalidateGetWorkflowSchedule =
  useInvalidateGetWorkflowSchedule as jest.MockedFunction<typeof useInvalidateGetWorkflowSchedule>;

const mockScheduleToUpdate: AttackDiscoveryScheduleUpdateProps = {
  name: 'Updated Workflow Schedule',
  params: {
    alerts_index_pattern: '.alerts-security.alerts-default',
    api_config: {
      connector_id: 'test-connector',
      action_type_id: '.bedrock',
    },
    size: 200,
  },
  schedule: { interval: '30m' },
  actions: [],
};

const mockUpdatedScheduleResponse: AttackDiscoverySchedule = {
  id: 'updated-schedule-id',
  name: 'Updated Workflow Schedule',
  created_by: 'test-user',
  updated_by: 'test-user',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
  enabled: true,
  params: {
    alerts_index_pattern: '.alerts-security.alerts-default',
    api_config: {
      action_type_id: '.bedrock',
      connector_id: 'test-connector',
      name: 'test-config',
    },
    size: 200,
  },
  schedule: { interval: '30m' },
  actions: [],
};

describe('useUpdateWorkflowSchedule', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);

    setQueryDataMock.mockReset();
    useQueryClientMock.mockReturnValue({
      setQueryData: setQueryDataMock,
    } as unknown as ReturnType<typeof useQueryClient>);

    updateWorkflowScheduleMock.mockResolvedValue(mockUpdatedScheduleResponse);

    mockUseInvalidateFindWorkflowSchedules.mockReturnValue(
      invalidateFindWorkflowSchedulesMock as unknown as jest.Mocked<
        ReturnType<typeof useInvalidateFindWorkflowSchedules>
      >
    );
    mockUseInvalidateGetWorkflowSchedule.mockReturnValue(
      invalidateGetWorkflowScheduleMock as unknown as jest.Mocked<
        ReturnType<typeof useInvalidateGetWorkflowSchedule>
      >
    );
  });

  it('invokes `updateWorkflowSchedule` with the correct id and body', async () => {
    const result = await renderMutation(() => useUpdateWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-0', scheduleToUpdate: mockScheduleToUpdate });
      expect(updateWorkflowScheduleMock).toHaveBeenCalledWith({
        body: mockScheduleToUpdate,
        id: 'test-0',
      });
    });
  });

  it('invokes `addSuccess` on success', async () => {
    const result = await renderMutation(() => useUpdateWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-1', scheduleToUpdate: mockScheduleToUpdate });
      expect(appToastsMock.addSuccess).toHaveBeenCalledWith(
        '1 attack discovery schedule updated successfully.'
      );
    });
  });

  it('invalidates the find query on success', async () => {
    const result = await renderMutation(() => useUpdateWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-2', scheduleToUpdate: mockScheduleToUpdate });
      expect(invalidateFindWorkflowSchedulesMock).toHaveBeenCalled();
    });
  });

  it('writes the authoritative update response into the get-by-id cache on success', async () => {
    const result = await renderMutation(() => useUpdateWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({
        id: 'updated-schedule-id',
        scheduleToUpdate: mockScheduleToUpdate,
      });
    });

    expect(setQueryDataMock).toHaveBeenCalledWith(
      [
        'GET',
        '/internal/attack_discovery/schedules/updated-schedule-id',
        { id: 'updated-schedule-id' },
      ],
      {
        schedule: expect.objectContaining({
          id: 'updated-schedule-id',
          name: 'Updated Workflow Schedule',
        }),
      }
    );
  });

  it('does not invalidate (and refetch) the get query on success to avoid clobbering the fresh cache', async () => {
    const result = await renderMutation(() => useUpdateWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({
        id: 'updated-schedule-id',
        scheduleToUpdate: mockScheduleToUpdate,
      });
    });

    expect(invalidateGetWorkflowScheduleMock).not.toHaveBeenCalled();
  });

  it('falls back to invalidating the get query when the response cannot be transformed', async () => {
    updateWorkflowScheduleMock.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof updateWorkflowSchedule>>
    );

    const result = await renderMutation(() => useUpdateWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-3', scheduleToUpdate: mockScheduleToUpdate });
    });

    expect(setQueryDataMock).not.toHaveBeenCalled();
    expect(invalidateGetWorkflowScheduleMock).toHaveBeenCalledWith('test-3');
  });

  it('invokes `addError` on failure', async () => {
    updateWorkflowScheduleMock.mockRejectedValue('Royally failed!');

    const result = await renderMutation(() => useUpdateWorkflowSchedule());

    await act(async () => {
      try {
        await result.mutateAsync({ id: 'test-4', scheduleToUpdate: mockScheduleToUpdate });
      } catch (err) {
        expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
          title: 'Failed to update 1 attack discovery schedule',
        });
      }
    });
  });
});
