/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

let hasLoggedProfileUidError = false;

interface ResolveCurrentUserParams {
  currentUser: AuthenticatedUser | null;
  logger: Logger;
  request: KibanaRequest;
  security: SecurityPluginStart;
}

export const resolveCurrentUser = async ({
  currentUser,
  logger,
  request,
  security,
}: ResolveCurrentUserParams): Promise<AuthenticatedUser | null> => {
  if (!currentUser || currentUser.profile_uid) {
    return currentUser;
  }

  if (currentUser.authentication_type === 'api_key' && currentUser.api_key?.id) {
    return { ...currentUser, profile_uid: currentUser.api_key.id };
  }

  try {
    const profile = await security.userProfiles.getCurrent({ request });
    return profile ? { ...currentUser, profile_uid: profile.uid } : currentUser;
  } catch (error) {
    if (!hasLoggedProfileUidError) {
      hasLoggedProfileUidError = true;
      logger.warn(`Failed to get user profile_uid; continuing without it. ${error}`);
    }
    return currentUser;
  }
};
