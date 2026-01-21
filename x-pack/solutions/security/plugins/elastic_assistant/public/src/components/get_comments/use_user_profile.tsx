/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UserProfileAvatarData } from '@kbn/user-profile-components';
import type { User } from '@kbn/elastic-assistant-common';
import type { UserProfile } from '@kbn/core-user-profile-common';
import { useKibana } from '../../context/typed_kibana_context/typed_kibana_context';
export interface UserProfileWithAvatar extends UserProfile {
  avatar: UserProfileAvatarData;
}
interface Props {
  // legacy message object does not include user
  user?: User;
}
export const useUserProfile = ({ user }: Props) => {
  const { userProfile } = useKibana().services;

  return useQuery({
    queryKey: ['userProfile', user?.id ?? ''],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }
      const data = await userProfile?.bulkGet<{ avatar: UserProfileAvatarData }>({
        uids: new Set([user?.id ?? '']),
        dataPath: 'avatar',
      });
      return data ?? [];
    },
    select: (profiles) => {
      if (!profiles || !profiles[0]) return null;
      const profile = profiles[0];
      return {
        ...profile,
        avatar: profile.data?.avatar,
      };
    },
    enabled: !!user?.id?.length,
  });
};
