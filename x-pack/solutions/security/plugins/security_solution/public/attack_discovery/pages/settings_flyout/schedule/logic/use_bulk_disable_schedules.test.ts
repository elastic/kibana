/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';

import { useBulkDisableAttackDiscoverySchedules } from './use_bulk_disable_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderMutation } from '../../../../../management/hooks/test_utils';
import { useInvalidateFindAttackDiscoverySchedule } from './use_find_schedules';
import { bulkDisableAttackDiscoverySchedules } from '../api';
import { useInvalidateGetAttackDiscoverySchedule } from './use_get_schedule';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoverySchedulesEventTypes } from '../../../../../common/lib/telemetry';

jest.mock('./use_find_schedules');
jest.mock('./use_get_schedule');
jest.mock('../api');
jest.mock('../../../../../common/hooks/use_app_toasts');
jest.mock('../../../../../common/lib/kibana');

const bulkDisableAttackDiscoverySchedulesMock =
  bulkDisableAttackDiscoverySchedules as jest.MockedFunction<
    typeof bulkDisableAttackDiscoverySchedules
  >;

const invalidateFindAttackDiscoveryScheduleMock = jest.fn();
const mockUseInvalidateFindAttackDiscoverySchedule =
  useInvalidateFindAttackDiscoverySchedule as jest.MockedFunction<
    typeof useInvalidateFindAttackDiscoverySchedule
  >;

const invalidateGetAttackDiscoveryScheduleMock = jest.fn();
const mockUseInvalidateGetAttackDiscoverySchedule =
  useInvalidateGetAttackDiscoverySchedule as jest.MockedFunction<
    typeof useInvalidateGetAttackDiscoverySchedule
  >;

describe('useBulkDisableAttackDiscoverySchedules', () => {
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

    bulkDisableAttackDiscoverySchedulesMock.mockResolvedValue({
      ids,
      errors: [],
      total: ids.length,
    });

    mockUseInvalidateFindAttackDiscoverySchedule.mockReturnValue(
      invalidateFindAttackDiscoveryScheduleMock as unknown as jest.Mocked<
        ReturnType<typeof useInvalidateFindAttackDiscoverySchedule>
      >
    );
    mockUseInvalidateGetAttackDiscoverySchedule.mockReturnValue(
      invalidateGetAttackDiscoveryScheduleMock as unknown as jest.Mocked<
        ReturnType<typeof useInvalidateGetAttackDiscoverySchedule>
      >
    );
  });

  it('should invoke `bulkDisableAttackDiscoverySchedules`', async () => {
    const result = await renderMutation(() => useBulkDisableAttackDiscoverySchedules());

    await act(async () => {
      await result.mutateAsync({ ids });
      expect(bulkDisableAttackDiscoverySchedulesMock).toHaveBeenCalledWith({ ids });
    });
  });

  it('should invoke `addSuccess` and `reportEvent`', async () => {
    const result = await renderMutation(() => useBulkDisableAttackDiscoverySchedules());

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

  it('should invoke `invalidateFindAttackDiscoverySchedule`', async () => {
    const result = await renderMutation(() => useBulkDisableAttackDiscoverySchedules());

    await act(async () => {
      await result.mutateAsync({ ids });
      expect(invalidateFindAttackDiscoveryScheduleMock).toHaveBeenCalled();
    });
  });

  it('should invoke `invalidateGetAttackDiscoveryScheduleMock` for each disabled schedule', async () => {
    const result = await renderMutation(() => useBulkDisableAttackDiscoverySchedules());

    await act(async () => {
      await result.mutateAsync({ ids });
      expect(invalidateGetAttackDiscoveryScheduleMock).toHaveBeenCalledTimes(ids.length);
      expect(invalidateGetAttackDiscoveryScheduleMock).toHaveBeenNthCalledWith(1, ids[0], 0, ids);
      expect(invalidateGetAttackDiscoveryScheduleMock).toHaveBeenNthCalledWith(2, ids[1], 1, ids);
    });
  });

  it('should invoke `addError` and `reportEvent`', async () => {
    bulkDisableAttackDiscoverySchedulesMock.mockRejectedValue('Royally failed!');

    const result = await renderMutation(() => useBulkDisableAttackDiscoverySchedules());

    await act(async () => {
      try {
        await result.mutateAsync({ ids });
      } catch (err) {
        expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
          title: 'Failed to disable 2 attack discovery schedules',
        });
        expect(reportEventMock).toHaveBeenCalledWith(
          AttackDiscoverySchedulesEventTypes.BulkStatusUpdateFailed,
          {
            status: 'disabled',
            count: ids.length,
          }
        );
      }
    });
  });
});
