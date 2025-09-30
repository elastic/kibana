/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';

import { useDisableAttackDiscoverySchedule } from './use_disable_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderMutation } from '../../../../../management/hooks/test_utils';
import { useInvalidateFindAttackDiscoverySchedule } from './use_find_schedules';
import { disableAttackDiscoverySchedule } from '../api';
import { useInvalidateGetAttackDiscoverySchedule } from './use_get_schedule';

jest.mock('./use_find_schedules');
jest.mock('./use_get_schedule');
jest.mock('../api');
jest.mock('../../../../../common/hooks/use_app_toasts');

const mockUseKibanaFeatureFlags = jest
  .fn()
  .mockReturnValue({ attackDiscoveryPublicApiEnabled: false });
jest.mock('../../../use_kibana_feature_flags', () => ({
  useKibanaFeatureFlags: () => mockUseKibanaFeatureFlags(),
}));

const disableAttackDiscoveryScheduleMock = disableAttackDiscoverySchedule as jest.MockedFunction<
  typeof disableAttackDiscoverySchedule
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

describe('useDisableAttackDiscoverySchedule', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);

    disableAttackDiscoveryScheduleMock.mockReturnValue(
      {} as unknown as jest.Mocked<ReturnType<typeof disableAttackDiscoverySchedule>>
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

  it('should invoke `disableAttackDiscoverySchedule`', async () => {
    const result = await renderMutation(() => useDisableAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-0' });
      expect(disableAttackDiscoveryScheduleMock).toHaveBeenCalledWith({
        attackDiscoveryPublicApiEnabled: false,
        id: 'test-0',
      });
    });
  });

  it('should invoke `addSuccess`', async () => {
    const result = await renderMutation(() => useDisableAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-1' });
      expect(appToastsMock.addSuccess).toHaveBeenCalledWith(
        '1 attack discovery schedule disabled successfully.'
      );
    });
  });

  it('should invoke `invalidateFindAttackDiscoverySchedule`', async () => {
    const result = await renderMutation(() => useDisableAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-2' });
      expect(invalidateFindAttackDiscoveryScheduleMock).toHaveBeenCalled();
    });
  });

  it('should invoke `invalidateGetAttackDiscoveryScheduleMock`', async () => {
    const result = await renderMutation(() => useDisableAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ id: 'test-3' });
      expect(invalidateGetAttackDiscoveryScheduleMock).toHaveBeenCalled();
    });
  });

  it('should invoke `addError`', async () => {
    disableAttackDiscoveryScheduleMock.mockRejectedValue('Royally failed!');

    const result = await renderMutation(() => useDisableAttackDiscoverySchedule());

    await act(async () => {
      try {
        await result.mutateAsync({ id: 'test-4' });
      } catch (err) {
        expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
          title: 'Failed to disable 1 attack discovery schedule',
        });
      }
    });
  });
});
