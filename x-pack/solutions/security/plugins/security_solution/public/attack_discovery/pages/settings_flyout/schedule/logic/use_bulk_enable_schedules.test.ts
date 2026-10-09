/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';

import { useBulkEnableAttackDiscoverySchedules } from './use_bulk_enable_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderMutation } from '../../../../../management/hooks/test_utils';
import { useInvalidateFindAttackDiscoverySchedule } from './use_find_schedules';
import { bulkEnableAttackDiscoverySchedules } from '../api';
import { useInvalidateGetAttackDiscoverySchedule } from './use_get_schedule';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoverySchedulesEventTypes } from '../../../../../common/lib/telemetry';

jest.mock('./use_find_schedules');
jest.mock('./use_get_schedule');
jest.mock('../api');
jest.mock('../../../../../common/hooks/use_app_toasts');
jest.mock('../../../../../common/lib/kibana');

const bulkEnableAttackDiscoverySchedulesMock =
  bulkEnableAttackDiscoverySchedules as jest.MockedFunction<
    typeof bulkEnableAttackDiscoverySchedules
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

describe('useBulkEnableAttackDiscoverySchedules', () => {
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

    bulkEnableAttackDiscoverySchedulesMock.mockResolvedValue({
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

  it('should invoke `bulkEnableAttackDiscoverySchedules`', async () => {
    const result = await renderMutation(() => useBulkEnableAttackDiscoverySchedules());

    await act(async () => {
      await result.mutateAsync({ ids });
      expect(bulkEnableAttackDiscoverySchedulesMock).toHaveBeenCalledWith({ ids });
    });
  });

  it('should invoke `addSuccess` and `reportEvent`', async () => {
    const result = await renderMutation(() => useBulkEnableAttackDiscoverySchedules());

    await act(async () => {
      await result.mutateAsync({ ids });
      expect(appToastsMock.addSuccess).toHaveBeenCalledWith(
        '2 attack discovery schedules enabled successfully.'
      );
      expect(reportEventMock).toHaveBeenCalledWith(
        AttackDiscoverySchedulesEventTypes.BulkStatusUpdateSuccess,
        {
          status: 'enabled',
          count: ids.length,
        }
      );
    });
  });

  it('should invoke `invalidateFindAttackDiscoverySchedule`', async () => {
    const result = await renderMutation(() => useBulkEnableAttackDiscoverySchedules());

    await act(async () => {
      await result.mutateAsync({ ids });
      expect(invalidateFindAttackDiscoveryScheduleMock).toHaveBeenCalled();
    });
  });

  it('should invoke `invalidateGetAttackDiscoveryScheduleMock` for each enabled schedule', async () => {
    const result = await renderMutation(() => useBulkEnableAttackDiscoverySchedules());

    await act(async () => {
      await result.mutateAsync({ ids });
      expect(invalidateGetAttackDiscoveryScheduleMock).toHaveBeenCalledTimes(ids.length);
      expect(invalidateGetAttackDiscoveryScheduleMock).toHaveBeenNthCalledWith(1, ids[0], 0, ids);
      expect(invalidateGetAttackDiscoveryScheduleMock).toHaveBeenNthCalledWith(2, ids[1], 1, ids);
    });
  });

  it('should invoke `addError` and `reportEvent`', async () => {
    bulkEnableAttackDiscoverySchedulesMock.mockRejectedValue('Royally failed!');

    const result = await renderMutation(() => useBulkEnableAttackDiscoverySchedules());

    await act(async () => {
      try {
        await result.mutateAsync({ ids });
      } catch (err) {
        expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
          title: 'Failed to enable 2 attack discovery schedules',
        });
        expect(reportEventMock).toHaveBeenCalledWith(
          AttackDiscoverySchedulesEventTypes.BulkStatusUpdateFailed,
          {
            status: 'enabled',
            count: ids.length,
          }
        );
      }
    });
  });
});
