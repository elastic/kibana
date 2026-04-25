/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOParamsSchema } from '@kbn/slo-schema';
import { DefaultBurnRatesClient, DefaultSummaryClient, GetSLO } from '../../services';
import { SLODefinitionClient } from '../../services/slo_definition_client';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const getSLORoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSLOParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient, spaceId, repository } = await getScopedClients({
      request,
      logger,
    });

    const burnRatesClient = new DefaultBurnRatesClient(scopedClusterClient.asCurrentUser);
    const summaryClient = new DefaultSummaryClient(
      scopedClusterClient.asCurrentUser,
      burnRatesClient
    );
    const definitionClient = new SLODefinitionClient(
      repository,
      scopedClusterClient.asCurrentUser,
      logger
    );
    const getSLO = new GetSLO(definitionClient, summaryClient);

    return await getSLO.execute(params.path.id, spaceId, params.query);
  },
});
