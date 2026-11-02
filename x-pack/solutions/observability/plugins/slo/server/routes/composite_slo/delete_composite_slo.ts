/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { deleteCompositeSlo } from '../../services/composites/delete_composite_slo';
import { createCompositeSloServerRoute } from './create_composite_slo_server_route';

export const deleteCompositeSLORoute = createCompositeSloServerRoute({
  endpoint: 'DELETE /api/observability/slo_composites/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: deleteCompositeSLOParamsSchema,
  handler: async ({ params, logger, request, getScopedClients, response }) => {
    const { scopedClusterClient, compositeRepository, spaceId } = await getScopedClients({
      request,
      logger,
    });

    await deleteCompositeSlo(
      { id: params.path.id, spaceId },
      {
        esClient: scopedClusterClient.asCurrentUser,
        compositeRepository,
        logger,
      }
    );

    return response.noContent();
  },
});
