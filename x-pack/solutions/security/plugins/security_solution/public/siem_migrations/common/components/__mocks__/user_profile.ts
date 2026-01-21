/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';

export const getMockUserProfile = (
  overrides?: Partial<UserProfileWithAvatar>
): UserProfileWithAvatar => {
  return {
    uid: 'user-1',
    enabled: true,
    user: {
      username: 'username',
      full_name: 'full name',
    },
    data: {},
    ...overrides,
  };
};
