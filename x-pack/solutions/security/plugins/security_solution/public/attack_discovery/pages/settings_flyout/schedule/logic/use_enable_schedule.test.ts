/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked, MockedFunction } from 'vitest';

import { act } from '@testing-library/react';

import { useEnableAttackDiscoverySchedule } from './use_enable_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderMutation } from '../../../../../management/hooks/test_utils';
import { useInvalidateFindAttackDiscoverySchedule } from './use_find_schedules';
import { enableAttackDiscoverySchedule } from '../api';
import { useInvalidateGetAttackDiscoverySchedule } from './use_get_schedule';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoverySchedulesEventTypes } from '../../../../../common/lib/telemetry';

vi.mock('./use_find_schedules');
vi.mock('./use_get_schedule');
vi.mock('../api');
vi.mock('../../../../../common/hooks/use_app_toasts');
vi.mock('../../../../../common/lib/kibana');

const enableAttackDiscoveryScheduleMock = enableAttackDiscoverySchedule as MockedFunction<
  typeof enableAttackDiscoverySchedule
>;

const invalidateFindAttackDiscoveryScheduleMock = vi.fn();
const mockUseInvalidateFindAttackDiscoverySchedule =
  useInvalidateFindAttackDiscoverySchedule as MockedFunction<
    typeof useInvalidateFindAttackDiscoverySchedule
  >;

const invalidateGetAttackDiscoveryScheduleMock = vi.fn();
const mockUseInvalidateGetAttackDiscoverySchedule =
  useInvalidateGetAttackDiscoverySchedule as MockedFunction<
    typeof useInvalidateGetAttackDiscoverySchedule
  >;

describe('useEnableAttackDiscoverySchedule', () => {
  let appToastsMock: Mocked<ReturnType<typeof useAppToastsMock.create>>;
  let reportEventMock: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    reportEventMock = vi.fn();
    (useKibana as Mock).mockReturnValue({
      services: {
        telemetry: {
          reportEvent: reportEventMock,
        },
      },
    });

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as Mock).mockReturnValue(appToastsMock);

    enableAttackDiscoveryScheduleMock.mockReturnValue(
      {} as unknown as Mocked<ReturnType<typeof enableAttackDiscoverySchedule>>
    );

    mockUseInvalidateFindAttackDiscoverySchedule.mockReturnValue(
      invalidateFindAttackDiscoveryScheduleMock as unknown as Mocked<
        ReturnType<typeof useInvalidateFindAttackDiscoverySchedule>
      >
    );
    mockUseInvalidateGetAttackDiscoverySchedule.mockReturnValue(
      invalidateGetAttackDiscoveryScheduleMock as unknown as Mocked<
        ReturnType<typeof useInvalidateGetAttackDiscoverySchedule>
      >
    );
  });

  it('should invoke `enableAttackDiscoverySchedule`', async () => {
    const result = await renderMutation(() => useEnableAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-0' });
      expect(enableAttackDiscoveryScheduleMock).toHaveBeenCalledWith({
        id: 'test-0',
      });
    });
  });

  it('should invoke `addSuccess` and `reportEvent`', async () => {
    const result = await renderMutation(() => useEnableAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-1' });
      expect(appToastsMock.addSuccess).toHaveBeenCalledWith(
        '1 attack discovery schedule enabled successfully.'
      );
      expect(reportEventMock).toHaveBeenCalledWith(
        AttackDiscoverySchedulesEventTypes.StatusUpdateSuccess,
        {
          status: 'enabled',
        }
      );
    });
  });

  it('should invoke `invalidateFindAttackDiscoverySchedule`', async () => {
    const result = await renderMutation(() => useEnableAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-2' });
      expect(invalidateFindAttackDiscoveryScheduleMock).toHaveBeenCalled();
    });
  });

  it('should invoke `invalidateGetAttackDiscoveryScheduleMock`', async () => {
    const result = await renderMutation(() => useEnableAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-3' });
      expect(invalidateGetAttackDiscoveryScheduleMock).toHaveBeenCalled();
    });
  });

  it('should invoke `addError` and `reportEvent`', async () => {
    enableAttackDiscoveryScheduleMock.mockRejectedValue('Royally failed!');

    const result = await renderMutation(() => useEnableAttackDiscoverySchedule());

    await act(async () => {
      try {
        await result.mutateAsync({ id: 'test-4' });
      } catch (err) {
        expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
          title: 'Failed to enable 1 attack discovery schedule',
        });
        expect(reportEventMock).toHaveBeenCalledWith(
          AttackDiscoverySchedulesEventTypes.StatusUpdateFailed,
          {
            status: 'enabled',
          }
        );
      }
    });
  });
});
