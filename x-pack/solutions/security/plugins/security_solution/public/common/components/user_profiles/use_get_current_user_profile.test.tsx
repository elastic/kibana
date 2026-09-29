/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock, Mocked } from 'vitest';

import { waitFor, renderHook } from '@testing-library/react';
import { securityMock } from '@kbn/security-plugin/public/mocks';

import { mockCurrentUserProfile } from './mock';
import { useGetCurrentUserProfile } from './use_get_current_user_profile';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useAppToastsMock } from '../../hooks/use_app_toasts.mock';
import { createStartServicesMock } from '../../lib/kibana/kibana_react.mock';
import { TestProviders } from '../../mock';

vi.mock('../../lib/kibana');
vi.mock('../../hooks/use_app_toasts');

describe('useGetCurrentUserProfile hook', () => {
  let appToastsMock: Mocked<ReturnType<typeof useAppToastsMock.create>>;
  beforeEach(() => {
    vi.clearAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as Mock).mockReturnValue(appToastsMock);
    const security = securityMock.createStart();
    security.userProfiles.getCurrent.mockReturnValue(Promise.resolve(mockCurrentUserProfile));
    (useKibana as Mock).mockReturnValue({
      services: {
        ...createStartServicesMock(),
        security,
      },
    });
  });

  it('returns current user', async () => {
    const userProfiles = useKibana().services.security.userProfiles;
    const spyOnUserProfiles = vi.spyOn(userProfiles, 'getCurrent');
    const { result } = renderHook(() => useGetCurrentUserProfile(), {
      wrapper: TestProviders,
    });
    await waitFor(() => expect(result.current.isLoading).toEqual(false));

    expect(spyOnUserProfiles).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(mockCurrentUserProfile);
  });
});
