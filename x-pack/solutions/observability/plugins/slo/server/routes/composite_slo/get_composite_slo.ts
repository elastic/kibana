/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { DefaultBurnRatesClient, DefaultSummaryClient, GetCompositeSLO } from '../../services';
import { createCompositeSloServerRoute } from './create_composite_slo_server_route';

export const getCompositeSLORoute = createCompositeSloServerRoute({
  endpoint: 'GET /api/observability/slo_composites/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getCompositeSLOParamsSchema,
  handler: async ({ context, params, logger, request, plugins, getScopedClients }) => {
    const { scopedClusterClient, repository, compositeSloRepository, spaceId } =
      await getScopedClients({
        request,
        logger,
      });

    const burnRatesClient = new DefaultBurnRatesClient(scopedClusterClient.asCurrentUser);
    const summaryClient = new DefaultSummaryClient(
      scopedClusterClient.asCurrentUser,
      burnRatesClient
    );
    const getCompositeSLO = new GetCompositeSLO(
      compositeSloRepository,
      repository,
      summaryClient,
      scopedClusterClient.asCurrentUser
    );

    return await getCompositeSLO.execute(params.path.id, spaceId);
  },
});
