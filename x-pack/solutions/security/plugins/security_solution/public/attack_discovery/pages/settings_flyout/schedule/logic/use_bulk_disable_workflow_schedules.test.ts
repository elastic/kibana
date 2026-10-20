/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';

import { useBulkDisableWorkflowSchedules } from './use_bulk_disable_workflow_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderMutation } from '../../../../../management/hooks/test_utils';
import { useInvalidateFindWorkflowSchedules } from './use_find_workflow_schedules';
import { useInvalidateGetWorkflowSchedule } from './use_get_workflow_schedule';
import { disableWorkflowSchedule } from '../api/internal';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoverySchedulesEventTypes } from '../../../../../common/lib/telemetry';

jest.mock('./use_find_workflow_schedules');
jest.mock('./use_get_workflow_schedule');
jest.mock('../api/internal');
jest.mock('../../../../../common/hooks/use_app_toasts');
jest.mock('../../../../../common/lib/kibana');

const disableWorkflowScheduleMock = disableWorkflowSchedule as jest.MockedFunction<
  typeof disableWorkflowSchedule
>;

const invalidateFindWorkflowSchedulesMock = jest.fn();
const mockUseInvalidateFindWorkflowSchedules =
  useInvalidateFindWorkflowSchedules as jest.MockedFunction<
    typeof useInvalidateFindWorkflowSchedules
  >;

const invalidateGetWorkflowScheduleMock = jest.fn();
const mockUseInvalidateGetWorkflowSchedule =
  useInvalidateGetWorkflowSchedule as jest.MockedFunction<typeof useInvalidateGetWorkflowSchedule>;

describe('useBulkDisableWorkflowSchedules', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;
  let reportEventMock: jest.Mock;
  const ids = ['test-0', 'test-1'];

  beforeEach(() => {
    jest.clearAllMocks();

    reportEventMock = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        telemetry: {
          reportEvent: reportEventMock,
        },
      },
    });

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);

    disableWorkflowScheduleMock.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof disableWorkflowSchedule>>
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

  it('fans out to the internal per-id disable endpoint for every id', async () => {
    const result = await renderMutation(() => useBulkDisableWorkflowSchedules());

    await act(async () => {
      await result.mutateAsync({ ids });
      expect(disableWorkflowScheduleMock).toHaveBeenCalledTimes(2);
      expect(disableWorkflowScheduleMock).toHaveBeenCalledWith({ id: 'test-0' });
      expect(disableWorkflowScheduleMock).toHaveBeenCalledWith({ id: 'test-1' });
    });
  });

  it('invokes `addSuccess` and `reportEvent` with the succeeded count', async () => {
    const result = await renderMutation(() => useBulkDisableWorkflowSchedules());

    await act(async () => {
      await result.mutateAsync({ ids });
      expect(appToastsMock.addSuccess).toHaveBeenCalledWith(
        '2 attack discovery schedules disabled successfully.'
      );
      expect(reportEventMock).toHaveBeenCalledWith(
        AttackDiscoverySchedulesEventTypes.BulkStatusUpdateSuccess,
        {
          status: 'disabled',
          count: ids.length,
        }
      );
    });
  });

  it('invalidates the find query and the get query for each succeeded id', async () => {
    const result = await renderMutation(() => useBulkDisableWorkflowSchedules());

    await act(async () => {
      await result.mutateAsync({ ids });
      expect(invalidateFindWorkflowSchedulesMock).toHaveBeenCalled();
      expect(invalidateGetWorkflowScheduleMock).toHaveBeenCalledTimes(ids.length);
    });
  });

  it('reports only the succeeded ids when some per-id calls fail (partial success)', async () => {
    disableWorkflowScheduleMock.mockImplementation(({ id }) =>
      id === 'test-1'
        ? Promise.reject(new Error('no'))
        : Promise.resolve({} as unknown as Awaited<ReturnType<typeof disableWorkflowSchedule>>)
    );

    const result = await renderMutation(() => useBulkDisableWorkflowSchedules());

    await act(async () => {
      const response = await result.mutateAsync({ ids });
      expect(response.ids).toEqual(['test-0']);
      expect(response.errors).toEqual([{ message: 'no', rule: { id: 'test-1', name: 'test-1' } }]);
      expect(appToastsMock.addSuccess).toHaveBeenCalledWith(
        '1 attack discovery schedule disabled successfully.'
      );
    });
  });
});
