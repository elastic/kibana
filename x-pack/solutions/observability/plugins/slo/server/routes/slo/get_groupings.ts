/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOGroupingsParamsSchema } from '@kbn/slo-schema';
import { GetSLOGroupings } from '../../services/get_slo_groupings';
import { SloDefinitionClient } from '../../services/slo_definition_client';
import { getSloSettings } from '../../services/slo_settings';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const getSLOGroupingsRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/{id}/_groupings',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSLOGroupingsParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient, repository, soClient, spaceId } = await getScopedClients({
      request,
      logger,
    });

    const settings = await getSloSettings(soClient);

    const definitionClient = new SloDefinitionClient(
      repository,
      scopedClusterClient.asCurrentUser,
      logger
    );

    const getSLOGroupings = new GetSLOGroupings(
      definitionClient,
      scopedClusterClient.asCurrentUser,
      settings,
      spaceId
    );

    return await getSLOGroupings.execute(params.path.id, params.query);
  },
});
