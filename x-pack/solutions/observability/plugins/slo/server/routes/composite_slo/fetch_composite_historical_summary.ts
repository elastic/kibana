/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchCompositeHistoricalSummaryParamsSchema } from '@kbn/slo-schema';
import { CompositeHistoricalSummaryClient } from '../../services';
import { createCompositeSloServerRoute } from './create_composite_slo_server_route';

export const fetchCompositeHistoricalSummaryRoute = createCompositeSloServerRoute({
  endpoint: 'POST /internal/observability/slo_composites/_historical_summary',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: fetchCompositeHistoricalSummaryParamsSchema,
  handler: async ({ context, request, logger, params, plugins, getScopedClients }) => {
    const { scopedClusterClient, repository, compositeSloRepository } = await getScopedClients({
      request,
      logger,
    });

    const client = new CompositeHistoricalSummaryClient(
      scopedClusterClient.asCurrentUser,
      compositeSloRepository,
      repository
    );

    return await client.fetch(params.body);
  },
});
