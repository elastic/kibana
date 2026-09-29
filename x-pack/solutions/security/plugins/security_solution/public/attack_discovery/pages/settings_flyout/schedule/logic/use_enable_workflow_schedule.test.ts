/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked, MockedFunction } from 'vitest';

import { act } from '@testing-library/react';

import { useEnableWorkflowSchedule } from './use_enable_workflow_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderMutation } from '../../../../../management/hooks/test_utils';
import { useInvalidateFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useInvalidateGetWorkflowSchedule } from './use_get_workflow_schedule';
import { enableWorkflowSchedule } from '../api/internal';

vi.mock('./use_find_workflow_schedules');
vi.mock('./use_get_workflow_schedule');
vi.mock('../api/internal');
vi.mock('../../../../../common/hooks/use_app_toasts');

const enableWorkflowScheduleMock = enableWorkflowSchedule as MockedFunction<
  typeof enableWorkflowSchedule
>;

const invalidateFindWorkflowSchedulesMock = vi.fn();
const mockUseInvalidateFindWorkflowSchedules = useInvalidateFindWorkflowSchedules as MockedFunction<
  typeof useInvalidateFindWorkflowSchedules
>;

const invalidateGetWorkflowScheduleMock = vi.fn();
const mockUseInvalidateGetWorkflowSchedule = useInvalidateGetWorkflowSchedule as MockedFunction<
  typeof useInvalidateGetWorkflowSchedule
>;

describe('useEnableWorkflowSchedule', () => {
  let appToastsMock: Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    vi.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as Mock).mockReturnValue(appToastsMock);

    enableWorkflowScheduleMock.mockReturnValue(
      {} as unknown as Mocked<ReturnType<typeof enableWorkflowSchedule>>
    );

    mockUseInvalidateFindWorkflowSchedules.mockReturnValue(
      invalidateFindWorkflowSchedulesMock as unknown as Mocked<
        ReturnType<typeof useInvalidateFindWorkflowSchedules>
      >
    );
    mockUseInvalidateGetWorkflowSchedule.mockReturnValue(
      invalidateGetWorkflowScheduleMock as unknown as Mocked<
        ReturnType<typeof useInvalidateGetWorkflowSchedule>
      >
    );
  });

  it('invokes `enableWorkflowSchedule` with the correct id', async () => {
    const result = await renderMutation(() => useEnableWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-0' });
      expect(enableWorkflowScheduleMock).toHaveBeenCalledWith({
        id: 'test-0',
      });
    });
  });

  it('invokes `addSuccess` on success', async () => {
    const result = await renderMutation(() => useEnableWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-1' });
      expect(appToastsMock.addSuccess).toHaveBeenCalledWith(
        '1 attack discovery schedule enabled successfully.'
      );
    });
  });

  it('invalidates the find query on success', async () => {
    const result = await renderMutation(() => useEnableWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-2' });
      expect(invalidateFindWorkflowSchedulesMock).toHaveBeenCalled();
    });
  });

  it('invalidates the get query on success', async () => {
    const result = await renderMutation(() => useEnableWorkflowSchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-3' });
      expect(invalidateGetWorkflowScheduleMock).toHaveBeenCalled();
    });
  });

  it('invokes `addError` on failure', async () => {
    enableWorkflowScheduleMock.mockRejectedValue('Royally failed!');

    const result = await renderMutation(() => useEnableWorkflowSchedule());

    await act(async () => {
      try {
        await result.mutateAsync({ id: 'test-4' });
      } catch (err) {
        expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
          title: 'Failed to enable 1 attack discovery schedule',
        });
      }
    });
  });
});
