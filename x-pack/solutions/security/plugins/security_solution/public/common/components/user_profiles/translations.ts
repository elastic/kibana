/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CURRENT_USER_PROFILE_FAILURE = i18n.translate(
  'xpack.securitySolution.userProfiles.fetchCurrentUserProfile.failure',
  { defaultMessage: 'Failed to find current user' }
);

export const USER_PROFILES_FAILURE = i18n.translate(
  'xpack.securitySolution.userProfiles.fetchUserProfiles.failure',
  {
    defaultMessage: 'Failed to find users',
  }
);

/**
 * Used whenever we need to display a user name and for some reason it is not available
 */
export const UNKNOWN_USER_PROFILE_NAME = i18n.translate(
  'xpack.securitySolution.userProfiles.unknownUser.displayName',
  { defaultMessage: 'Unknown' }
);
