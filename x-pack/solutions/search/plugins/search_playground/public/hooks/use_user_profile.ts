/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from './use_kibana';

export const useUserProfile = (): UserProfileWithAvatar | undefined => {
  const { security } = useKibana().services;

  return useQuery<UserProfileWithAvatar>(
    ['useGetCurrentUserProfile'],
    async () => {
      return security.userProfiles.getCurrent({ dataPath: 'avatar' });
    },
    {
      retry: false,
      staleTime: Infinity,
    }
  ).data;
};
