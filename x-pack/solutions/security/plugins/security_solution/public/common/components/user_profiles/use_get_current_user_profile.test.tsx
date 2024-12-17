/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { securityMock } from '@kbn/security-plugin/public/mocks';

import { mockCurrentUserProfile } from './mock';
import { useGetCurrentUserProfile } from './use_get_current_user_profile';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useAppToastsMock } from '../../hooks/use_app_toasts.mock';
import { createStartServicesMock } from '../../lib/kibana/kibana_react.mock';
import { TestProviders } from '../../mock';

jest.mock('../../lib/kibana');
jest.mock('../../hooks/use_app_toasts');

describe('useGetCurrentUserProfile hook', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;
  beforeEach(() => {
    jest.clearAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
    const security = securityMock.createStart();
    security.userProfiles.getCurrent.mockReturnValue(Promise.resolve(mockCurrentUserProfile));
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...createStartServicesMock(),
        security,
      },
    });
  });

  it('returns current user', async () => {
    const userProfiles = useKibana().services.security.userProfiles;
    const spyOnUserProfiles = jest.spyOn(userProfiles, 'getCurrent');
    const { result, waitForNextUpdate } = renderHook(() => useGetCurrentUserProfile(), {
      wrapper: TestProviders,
    });
    await waitForNextUpdate();

    expect(spyOnUserProfiles).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.data).toEqual(mockCurrentUserProfile);
  });
});
