/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core-security-common';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { resolveCurrentUser } from './resolve_current_user';

const currentUser = {
  username: 'shared-user',
  authentication_realm: {
    type: 'file',
    name: 'file',
  },
} as AuthenticatedUser;

const currentUserProfile = {
  uid: 'file-realm-profile',
  enabled: true,
  data: {},
  labels: {},
  user: {
    username: 'shared-user',
    roles: [],
    realm_name: 'file',
  },
};

describe('resolveCurrentUser', () => {
  const logger = loggingSystemMock.createLogger();
  const request = httpServerMock.createKibanaRequest();
  let security: ReturnType<typeof securityMock.createStart>;

  beforeEach(() => {
    jest.clearAllMocks();
    security = securityMock.createStart();
  });

  it('uses the profile UID resolved from the authenticated request', async () => {
    security.userProfiles.getCurrent.mockResolvedValue(currentUserProfile);

    await expect(resolveCurrentUser({ currentUser, logger, request, security })).resolves.toEqual({
      ...currentUser,
      profile_uid: 'file-realm-profile',
    });
    expect(security.userProfiles.getCurrent).toHaveBeenCalledWith({ request });
  });

  it('does not substitute the username when profile resolution returns no UID', async () => {
    security.userProfiles.getCurrent.mockResolvedValue(null);

    await expect(resolveCurrentUser({ currentUser, logger, request, security })).resolves.toEqual(
      currentUser
    );
  });

  it('uses the unique API key ID when the user has no profile UID', async () => {
    const apiKeyUser = {
      ...currentUser,
      authentication_type: 'api_key',
      api_key: { id: 'api-key-id', name: 'api-key-name' },
    } as AuthenticatedUser;

    await expect(
      resolveCurrentUser({ currentUser: apiKeyUser, logger, request, security })
    ).resolves.toEqual({ ...apiKeyUser, profile_uid: 'api-key-id' });
    expect(security.userProfiles.getCurrent).not.toHaveBeenCalled();
  });
});
