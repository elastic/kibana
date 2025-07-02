/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOParamsSchema } from '@kbn/slo-schema';
import {
  DefaultBurnRatesClient,
  DefaultSummaryClient,
  GetSLO,
  KibanaSavedObjectsSLORepository,
} from '../../services';
import { SloDefinitionClient } from '../../services/slo_definition_client';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { getSpaceId } from './utils/get_space_id';

export const getSLORoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSLOParamsSchema,
  handler: async ({ request, context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);

    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const burnRatesClient = new DefaultBurnRatesClient(esClient);
    const summaryClient = new DefaultSummaryClient(esClient, burnRatesClient);
    const definitionClient = new SloDefinitionClient(repository, esClient, logger);
    const getSLO = new GetSLO(definitionClient, summaryClient);

    return await getSLO.execute(params.path.id, spaceId, params.query);
  },
});
