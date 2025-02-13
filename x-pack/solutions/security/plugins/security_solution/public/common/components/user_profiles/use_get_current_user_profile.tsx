/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

import { CURRENT_USER_PROFILE_FAILURE } from './translations';
import { useKibana } from '../../lib/kibana';
import { useAppToasts } from '../../hooks/use_app_toasts';

export const getCurrentUserProfile = async ({
  security,
}: {
  security: SecurityPluginStart;
}): Promise<UserProfileWithAvatar> => {
  return security.userProfiles.getCurrent({ dataPath: 'avatar' });
};

/**
 * Fetches current user profile using `userProfiles` service via `security.userProfiles.getCurrent()`
 *
 * NOTE: There is a similar hook `useCurrentUser` which fetches current authenticated user via `security.authc.getCurrentUser()`
 */
export const useGetCurrentUserProfile = () => {
  const { security } = useKibana().services;
  const { addError } = useAppToasts();

  return useQuery<UserProfileWithAvatar>(
    ['useGetCurrentUserProfile'],
    async () => {
      return getCurrentUserProfile({ security });
    },
    {
      retry: false,
      staleTime: Infinity,
      onError: (e) => {
        addError(e, { title: CURRENT_USER_PROFILE_FAILURE });
      },
    }
  );
};
