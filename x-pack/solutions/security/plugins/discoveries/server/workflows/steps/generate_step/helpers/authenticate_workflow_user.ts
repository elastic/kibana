/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, CoreStart, KibanaRequest } from '@kbn/core/server';

export const authenticateWorkflowUser = async ({
  coreStart,
  request,
}: {
  coreStart: CoreStart;
  request: KibanaRequest;
}): Promise<AuthenticatedUser> => {
  const authenticationInfo = await coreStart.elasticsearch.client
    .asScoped(request)
    .asCurrentUser.security.authenticate();

  return {
    ...(authenticationInfo as unknown as AuthenticatedUser),
    authentication_provider: { name: 'workflows', type: 'workflows' },
    elastic_cloud_user: false,
  };
};
