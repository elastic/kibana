/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar } from '@elastic/eui';
import type { User } from '@kbn/elastic-assistant-common';
import { UserAvatar } from '@kbn/user-profile-components';
import { useUserProfile } from './use_user_profile';
import * as i18n from './translations';

interface Props {
  // legacy message object does not include user
  user?: User;
}

export const SecurityUserAvatar: React.FC<Props> = ({ user }) => {
  const { data: userProfile } = useUserProfile({ user });
  if (userProfile) {
    return (
      <UserAvatar
        data-test-subj="userAvatar"
        user={userProfile.user}
        avatar={userProfile.avatar}
        size="l"
      />
    );
  }
  return (
    <EuiAvatar
      data-test-subj="genericAvatar"
      name="user"
      size="l"
      color="subdued"
      iconType="userAvatar"
    />
  );
};

export const SecurityUserName: React.FC<Props> = ({ user }) => {
  const { data: userProfile } = useUserProfile({ user });
  if (userProfile) {
    return userProfile.user.full_name ?? userProfile.user.username;
  }
  return user?.name ?? user?.id ?? i18n.YOU;
};
