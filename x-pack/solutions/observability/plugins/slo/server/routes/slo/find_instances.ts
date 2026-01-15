/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findSLOInstancesParamsSchema } from '@kbn/slo-schema';
import { findSLOInstances } from '../../services/find_slo_instances';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { SLODefinitionClient } from '../../services/slo_definition_client';

export const findSLOInstancesRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/{id}/_instances',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findSLOInstancesParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient, spaceId, repository } = await getScopedClients({
      request,
      logger,
    });

    const definitionClient = new SLODefinitionClient(
      repository,
      scopedClusterClient.asCurrentUser,
      logger
    );

    return await findSLOInstances(
      {
        search: params.query?.search,
        size: params.query?.size,
        searchAfter: params.query?.searchAfter,
        sloId: params.path.id,
        spaceId,
        remoteName: params.query?.remoteName,
      },
      { scopedClusterClient, definitionClient }
    );
  },
});
