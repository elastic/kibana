/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';

import { useCreateAttackDiscoverySchedule } from './use_create_schedule';
import { mockCreateAttackDiscoverySchedule } from '../../../mock/mock_attack_discovery_schedule';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderMutation } from '../../../../../management/hooks/test_utils';
import { useInvalidateFindAttackDiscoverySchedule } from './use_find_schedules';
import { createAttackDiscoverySchedule } from '../api';
import { useKibana } from '../../../../../common/lib/kibana';
import { AttackDiscoverySchedulesEventTypes } from '../../../../../common/lib/telemetry';

jest.mock('./use_find_schedules');
jest.mock('../api');
jest.mock('../../../../../common/hooks/use_app_toasts');
jest.mock('../../../../../common/lib/kibana');

const createAttackDiscoveryScheduleMock = createAttackDiscoverySchedule as jest.MockedFunction<
  typeof createAttackDiscoverySchedule
>;

const invalidateFindAttackDiscoveryScheduleMock = jest.fn();
const mockUseInvalidateFindAttackDiscoverySchedule =
  useInvalidateFindAttackDiscoverySchedule as jest.MockedFunction<
    typeof useInvalidateFindAttackDiscoverySchedule
  >;

describe('useCreateAttackDiscoverySchedule', () => {
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

    createAttackDiscoveryScheduleMock.mockReturnValue(
      {} as unknown as jest.Mocked<ReturnType<typeof createAttackDiscoverySchedule>>
    );

    mockUseInvalidateFindAttackDiscoverySchedule.mockReturnValue(
      invalidateFindAttackDiscoveryScheduleMock as unknown as jest.Mocked<
        ReturnType<typeof useInvalidateFindAttackDiscoverySchedule>
      >
    );
  });

  it('should invoke `createAttackDiscoverySchedule`', async () => {
    const result = await renderMutation(() => useCreateAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ scheduleToCreate: mockCreateAttackDiscoverySchedule });
      expect(createAttackDiscoveryScheduleMock).toHaveBeenCalledWith({
        body: mockCreateAttackDiscoverySchedule,
      });
    });
  });

  it('should invoke `addSuccess` and `reportEvent`', async () => {
    const result = await renderMutation(() => useCreateAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ scheduleToCreate: mockCreateAttackDiscoverySchedule });
      expect(appToastsMock.addSuccess).toHaveBeenCalledWith(
        '1 attack discovery schedule created successfully.'
      );
      expect(reportEventMock).toHaveBeenCalledWith(
        AttackDiscoverySchedulesEventTypes.CreateSuccess,
        {}
      );
    });
  });

  it('should invoke `invalidateFindAttackDiscoverySchedule`', async () => {
    const result = await renderMutation(() => useCreateAttackDiscoverySchedule());

    await act(async () => {
      await result.mutateAsync({ scheduleToCreate: mockCreateAttackDiscoverySchedule });
      expect(invalidateFindAttackDiscoveryScheduleMock).toHaveBeenCalled();
    });
  });

  it('should invoke `addError` and `reportEvent`', async () => {
    createAttackDiscoveryScheduleMock.mockRejectedValue('Royally failed!');

    const result = await renderMutation(() => useCreateAttackDiscoverySchedule());

    await act(async () => {
      try {
        await result.mutateAsync({ scheduleToCreate: mockCreateAttackDiscoverySchedule });
      } catch (err) {
        expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
          title: 'Failed to create 1 attack discovery schedule',
        });
        expect(reportEventMock).toHaveBeenCalledWith(
          AttackDiscoverySchedulesEventTypes.CreateFailed,
          {}
        );
      }
    });
  });
});
