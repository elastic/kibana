/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { securityMock } from '@kbn/security-plugin/public/mocks';

import { mockUserProfiles } from './mock';
import { useBulkGetUserProfiles } from './use_bulk_get_user_profiles';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useAppToastsMock } from '../../hooks/use_app_toasts.mock';
import { createStartServicesMock } from '../../lib/kibana/kibana_react.mock';
import { TestProviders } from '../../mock';

jest.mock('../../lib/kibana');
jest.mock('../../hooks/use_app_toasts');

describe('useBulkGetUserProfiles hook', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;
  beforeEach(() => {
    jest.clearAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
    const security = securityMock.createStart();
    security.userProfiles.bulkGet.mockReturnValue(Promise.resolve(mockUserProfiles));
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...createStartServicesMock(),
        security,
      },
    });
  });

  it('returns an array of userProfiles', async () => {
    const userProfiles = useKibana().services.security.userProfiles;
    const spyOnUserProfiles = jest.spyOn(userProfiles, 'bulkGet');
    const assigneesIds = new Set(['user1']);
    const { result, waitForNextUpdate } = renderHook(
      () => useBulkGetUserProfiles({ uids: assigneesIds }),
      {
        wrapper: TestProviders,
      }
    );
    await waitForNextUpdate();

    expect(spyOnUserProfiles).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.data).toEqual(mockUserProfiles);
  });
});
