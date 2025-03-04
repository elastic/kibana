/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOGroupingsParamsSchema } from '@kbn/slo-schema';
import { KibanaSavedObjectsSLORepository } from '../../services';
import { GetSLOGroupings } from '../../services/get_slo_groupings';
import { SloDefinitionClient } from '../../services/slo_definition_client';
import { getSloSettings } from '../../services/slo_settings';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { getSpaceId } from './utils/get_space_id';

export const getSLOGroupingsRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/{id}/_groupings',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSLOGroupingsParamsSchema,
  handler: async ({ context, params, request, logger, plugins }) => {
    await assertPlatinumLicense(plugins);
    const soClient = (await context.core).savedObjects.client;
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const [spaceId, settings] = await Promise.all([
      getSpaceId(plugins, request),
      getSloSettings(soClient),
    ]);

    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const definitionClient = new SloDefinitionClient(repository, esClient, logger);

    const getSLOGroupings = new GetSLOGroupings(definitionClient, esClient, settings, spaceId);

    return await getSLOGroupings.execute(params.path.id, params.query);
  },
});
