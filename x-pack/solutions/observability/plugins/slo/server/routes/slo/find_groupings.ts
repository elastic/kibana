/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findSLOGroupingsParamsSchema } from '@kbn/slo-schema';
import { FindSLOGroupings } from '../../services/find_slo_groupings';
import { SloDefinitionClient } from '../../services/slo_definition_client';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const findSLOGroupingsRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/{id}/_groupings',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findSLOGroupingsParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient, repository, spaceId, settingsRepository } = await getScopedClients(
      { request, logger }
    );

    const settings = await settingsRepository.get();

    const definitionClient = new SloDefinitionClient(
      repository,
      scopedClusterClient.asCurrentUser,
      logger
    );

    const findSLOGroupings = new FindSLOGroupings(
      definitionClient,
      scopedClusterClient.asCurrentUser,
      settings,
      spaceId
    );

    return await findSLOGroupings.execute(params.path.id, params.query);
  },
});
