/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AuthenticatedUser,
  CoreStart,
  ElasticsearchClient,
  KibanaRequest,
} from '@kbn/core/server';

import { getSpaceId } from '@kbn/discoveries/impl/lib/helpers/get_space_id';
import type { DiscoveriesPluginStartDeps } from '../../../../types';

export const authenticateAndGetSpace = async ({
  coreStart,
  pluginsStart,
  request,
}: {
  coreStart: CoreStart;
  pluginsStart: DiscoveriesPluginStartDeps;
  request: KibanaRequest;
}): Promise<{
  authenticationInfo: unknown;
  authenticatedUser: AuthenticatedUser;
  esClient: ElasticsearchClient;
  spaceId: string;
}> => {
  const authenticationInfo = await coreStart.elasticsearch.client
    .asScoped(request)
    .asCurrentUser.security.authenticate();

  const authenticatedUser: AuthenticatedUser = {
    ...(authenticationInfo as unknown as AuthenticatedUser),
    authentication_provider: { name: 'workflows', type: 'workflows' },
    elastic_cloud_user: false,
  };

  const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

  const spaceId = getSpaceId({
    request,
    spaces: pluginsStart.spaces?.spacesService,
  });

  return {
    authenticationInfo,
    authenticatedUser,
    esClient,
    spaceId,
  };
};
