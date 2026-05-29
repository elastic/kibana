/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import type { AttackDiscoveryScheduleCreateProps } from '@kbn/discoveries-schemas';

import { useCreateWorkflowSchedule } from './use_create_workflow_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderMutation } from '../../../../../management/hooks/test_utils';
import { useInvalidateFindWorkflowSchedules } from './use_find_workflow_schedules';
import { createWorkflowSchedule } from '../api/internal';

jest.mock('./use_find_workflow_schedules');
jest.mock('../api/internal');
jest.mock('../../../../../common/hooks/use_app_toasts');

const createWorkflowScheduleMock = createWorkflowSchedule as jest.MockedFunction<
  typeof createWorkflowSchedule
>;

const invalidateFindWorkflowSchedulesMock = jest.fn();
const mockUseInvalidateFindWorkflowSchedules =
  useInvalidateFindWorkflowSchedules as jest.MockedFunction<
    typeof useInvalidateFindWorkflowSchedules
  >;

const mockScheduleToCreate: AttackDiscoveryScheduleCreateProps = {
  name: 'Test Workflow Schedule',
  enabled: true,
  params: {
    alerts_index_pattern: '.alerts-security.alerts-default',
    api_config: {
      connector_id: 'test-connector',
      action_type_id: '.bedrock',
    },
    size: 100,
  },
  schedule: { interval: '10m' },
};

describe('useCreateWorkflowSchedule', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);

    createWorkflowScheduleMock.mockReturnValue(
      {} as unknown as jest.Mocked<ReturnType<typeof createWorkflowSchedule>>
    );

    mockUseInvalidateFindWorkflowSchedules.mockReturnValue(
      invalidateFindWorkflowSchedulesMock as unknown as jest.Mocked<
        ReturnType<typeof useInvalidateFindWorkflowSchedules>
      >
    );
  });

  it('invokes `createWorkflowSchedule` with the correct body', async () => {
    const result = await renderMutation(() => useCreateWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ scheduleToCreate: mockScheduleToCreate });
      expect(createWorkflowScheduleMock).toHaveBeenCalledWith({
        body: mockScheduleToCreate,
      });
    });
  });

  it('invokes `addSuccess` on success', async () => {
    const result = await renderMutation(() => useCreateWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ scheduleToCreate: mockScheduleToCreate });
      expect(appToastsMock.addSuccess).toHaveBeenCalledWith(
        '1 attack discovery schedule created successfully.'
      );
    });
  });

  it('invalidates the find query on success', async () => {
    const result = await renderMutation(() => useCreateWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ scheduleToCreate: mockScheduleToCreate });
      expect(invalidateFindWorkflowSchedulesMock).toHaveBeenCalled();
    });
  });

  it('invokes `addError` on failure', async () => {
    createWorkflowScheduleMock.mockRejectedValue('Royally failed!');

    const result = await renderMutation(() => useCreateWorkflowSchedule());

    await act(async () => {
      try {
        await result.mutateAsync({ scheduleToCreate: mockScheduleToCreate });
      } catch (err) {
        expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
          title: 'Failed to create 1 attack discovery schedule',
        });
      }
    });
  });
});
