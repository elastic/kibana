/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFindAttackDiscoverySchedules } from './use_find_schedules';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import { renderQuery } from '../../../../../management/hooks/test_utils';
import { findAttackDiscoverySchedule } from '../api';

jest.mock('../api');
jest.mock('../../../../../common/hooks/use_app_toasts');

const findAttackDiscoveryScheduleMock = findAttackDiscoverySchedule as jest.MockedFunction<
  typeof findAttackDiscoverySchedule
>;

describe('useFindAttackDiscoverySchedules', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();

    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);

    findAttackDiscoveryScheduleMock.mockReturnValue(
      {} as unknown as jest.Mocked<ReturnType<typeof findAttackDiscoverySchedule>>
    );
  });

  it('should invoke `findAttackDiscoverySchedule`', async () => {
    await renderQuery(() => useFindAttackDiscoverySchedules({ page: 1 }), 'isSuccess');

    expect(findAttackDiscoveryScheduleMock).toHaveBeenCalledWith({
      page: 1,
      signal: expect.anything(),
    });
  });

  it('should invoke `addError`', async () => {
    findAttackDiscoveryScheduleMock.mockRejectedValue('Royally failed!');

    await renderQuery(() => useFindAttackDiscoverySchedules({ page: 2 }), 'isError');

    expect(appToastsMock.addError).toHaveBeenCalledWith('Royally failed!', {
      title: 'Failed to fetch attack discovery schedules',
    });
  });
});
