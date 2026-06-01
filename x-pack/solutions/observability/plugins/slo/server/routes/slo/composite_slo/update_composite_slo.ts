/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { DefaultBurnRatesClient } from '../../../services/burn_rates_client';
import { DefaultSummaryClient } from '../../../services/summary_client';
import { updateCompositeSlo } from '../../../services/composites/update_composite_slo';
import { createCompositeSloServerRoute } from './create_composite_slo_server_route';

export const updateCompositeSLORoute = createCompositeSloServerRoute({
  endpoint: 'PUT /api/observability/slo_composites/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: updateCompositeSLOParamsSchema,
  handler: async ({ context, params, logger, request, plugins, getScopedClients }) => {
    const { scopedClusterClient, repository, compositeSloRepository, spaceId } =
      await getScopedClients({
        request,
        logger,
      });

    const core = await context.core;
    const userId = core.security.authc.getCurrentUser()?.username;

    const burnRatesClient = new DefaultBurnRatesClient(scopedClusterClient.asCurrentUser);
    const summaryClient = new DefaultSummaryClient(
      scopedClusterClient.asCurrentUser,
      burnRatesClient
    );

    return await updateCompositeSlo(
      { ...params.body, id: params.path.id, spaceId, userId },
      {
        esClient: scopedClusterClient.asCurrentUser,
        compositeSloRepository,
        sloDefinitionRepository: repository,
        summaryClient,
        logger,
      }
    );
  },
});
