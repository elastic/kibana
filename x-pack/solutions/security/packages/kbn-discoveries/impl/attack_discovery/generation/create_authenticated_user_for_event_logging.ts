/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser } from '@kbn/core/server';

export const createAuthenticatedUserForEventLogging = ({
  authenticationInfo,
}: {
  authenticationInfo: unknown;
}): AuthenticatedUser => ({
  ...(authenticationInfo as unknown as AuthenticatedUser),
  authentication_provider: { name: 'basic', type: 'basic' },
  elastic_cloud_user: false,
});
