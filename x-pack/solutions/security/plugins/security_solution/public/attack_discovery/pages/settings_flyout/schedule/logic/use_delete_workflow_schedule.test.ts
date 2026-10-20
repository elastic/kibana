/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';

import { useDeleteWorkflowSchedule } from './use_delete_workflow_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderMutation } from '../../../../../management/hooks/test_utils';
import { useInvalidateFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useInvalidateGetWorkflowSchedule } from './use_get_workflow_schedule';
import { deleteWorkflowSchedule } from '../api/internal';

jest.mock('./use_find_workflow_schedules');
jest.mock('./use_get_workflow_schedule');
jest.mock('../api/internal');
jest.mock('../../../../../common/hooks/use_app_toasts');

const deleteWorkflowScheduleMock = deleteWorkflowSchedule as jest.MockedFunction<
  typeof deleteWorkflowSchedule
>;

const invalidateFindWorkflowSchedulesMock = jest.fn();
const mockUseInvalidateFindWorkflowSchedules =
  useInvalidateFindWorkflowSchedules as jest.MockedFunction<
    typeof useInvalidateFindWorkflowSchedules
  >;

const invalidateGetWorkflowScheduleMock = jest.fn();
const mockUseInvalidateGetWorkflowSchedule =
  useInvalidateGetWorkflowSchedule as jest.MockedFunction<typeof useInvalidateGetWorkflowSchedule>;

describe('useDeleteWorkflowSchedule', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);

    deleteWorkflowScheduleMock.mockReturnValue(
      {} as unknown as jest.Mocked<ReturnType<typeof deleteWorkflowSchedule>>
    );

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

  it('invokes `deleteWorkflowSchedule` with the correct id', async () => {
    const result = await renderMutation(() => useDeleteWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-0' });
      expect(deleteWorkflowScheduleMock).toHaveBeenCalledWith({
        id: 'test-0',
      });
    });
  });

  it('invokes `addSuccess` on success', async () => {
    const result = await renderMutation(() => useDeleteWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-1' });
      expect(appToastsMock.addSuccess).toHaveBeenCalledWith(
        '1 attack discovery schedule deleted successfully.'
      );
    });
  });

  it('invalidates the find query on success', async () => {
    const result = await renderMutation(() => useDeleteWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-2' });
      expect(invalidateFindWorkflowSchedulesMock).toHaveBeenCalled();
    });
  });

  it('invalidates the get query on success', async () => {
    const result = await renderMutation(() => useDeleteWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-3' });
      expect(invalidateGetWorkflowScheduleMock).toHaveBeenCalled();
    });
  });

  it('invokes `addError` on failure', async () => {
    deleteWorkflowScheduleMock.mockRejectedValue('Royally failed!');

    const result = await renderMutation(() => useDeleteWorkflowSchedule());

    await act(async () => {
      try {
        await result.mutateAsync({ id: 'test-4' });
      } catch (err) {
        expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
          title: 'Failed to delete 1 attack discovery schedule',
        });
      }
    });
  });
});
