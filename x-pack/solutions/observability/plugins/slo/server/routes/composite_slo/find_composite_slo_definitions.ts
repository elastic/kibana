/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findCompositeSLODefinitionsParamsSchema } from '@kbn/slo-schema';
import { findCompositeSlo } from '../../services/composites/find_composite_slo_definitions';
import { createCompositeSloServerRoute } from './create_composite_slo_server_route';

export const findCompositeSLORoute = createCompositeSloServerRoute({
  endpoint: 'GET /api/observability/slo_composites 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findCompositeSLODefinitionsParamsSchema,
  handler: async ({ params, logger, request, getScopedClients }) => {
    const { scopedClusterClient, compositeRepository, spaceId } = await getScopedClients({
      request,
      logger,
    });

    return await findCompositeSlo(params?.query ?? {}, {
      spaceId,
      compositeRepository,
      esClient: scopedClusterClient.asCurrentUser,
    });
  },
});
