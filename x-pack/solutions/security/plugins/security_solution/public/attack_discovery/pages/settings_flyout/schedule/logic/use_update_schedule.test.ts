/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';

import { useUpdateAttackDiscoverySchedule } from './use_update_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderMutation } from '../../../../../management/hooks/test_utils';
import { useInvalidateFindAttackDiscoverySchedule } from './use_find_schedules';
import { updateAttackDiscoverySchedule } from '../api';
import { useInvalidateGetAttackDiscoverySchedule } from './use_get_schedule';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoverySchedulesEventTypes } from '../../../../../common/lib/telemetry';

jest.mock('./use_find_schedules');
jest.mock('./use_get_schedule');
jest.mock('../api');
jest.mock('../../../../../common/hooks/use_app_toasts');
jest.mock('../../../../../common/lib/kibana');

const updateAttackDiscoveryScheduleMock = updateAttackDiscoverySchedule as jest.MockedFunction<
  typeof updateAttackDiscoverySchedule
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

describe('useUpdateAttackDiscoverySchedule', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;
  let reportEventMock: jest.Mock;

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

    updateAttackDiscoveryScheduleMock.mockReturnValue(
      {} as unknown as jest.Mocked<ReturnType<typeof updateAttackDiscoverySchedule>>
    );

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

  it('should invoke `updateAttackDiscoverySchedule`', async () => {
    const result = await renderMutation(() => useUpdateAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-0' });
      expect(updateAttackDiscoveryScheduleMock).toHaveBeenCalledWith({
        id: 'test-0',
      });
    });
  });

  it('should invoke `addSuccess` and `reportEvent`', async () => {
    const result = await renderMutation(() => useUpdateAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-1' });
      expect(appToastsMock.addSuccess).toHaveBeenCalledWith(
        '1 attack discovery schedule updated successfully.'
      );
      expect(reportEventMock).toHaveBeenCalledWith(
        AttackDiscoverySchedulesEventTypes.UpdateSuccess,
        {}
      );
    });
  });

  it('should invoke `invalidateFindAttackDiscoverySchedule`', async () => {
    const result = await renderMutation(() => useUpdateAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-2' });
      expect(invalidateFindAttackDiscoveryScheduleMock).toHaveBeenCalled();
    });
  });

  it('should invoke `invalidateGetAttackDiscoveryScheduleMock`', async () => {
    const result = await renderMutation(() => useUpdateAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-3' });
      expect(invalidateGetAttackDiscoveryScheduleMock).toHaveBeenCalled();
    });
  });

  it('should invoke `addError` and `reportEvent`', async () => {
    updateAttackDiscoveryScheduleMock.mockRejectedValue('Royally failed!');

    const result = await renderMutation(() => useUpdateAttackDiscoverySchedule());

    await act(async () => {
      try {
        await result.mutateAsync({ id: 'test-4' });
      } catch (err) {
        expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
          title: 'Failed to update 1 attack discovery schedule',
        });
        expect(reportEventMock).toHaveBeenCalledWith(
          AttackDiscoverySchedulesEventTypes.UpdateFailed,
          {}
        );
      }
    });
  });
});
