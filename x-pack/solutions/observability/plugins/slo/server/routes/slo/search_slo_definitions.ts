/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchSLODefinitionsParamsSchema } from '@kbn/slo-schema';
import { SearchSLODefinitions } from '../../services';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const searchSloDefinitionsRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/_search_definitions',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: searchSLODefinitionsParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient, spaceId, settingsRepository } = await getScopedClients({
      request,
      logger,
    });

    const settings = await settingsRepository.get();
    const esClient = scopedClusterClient.asCurrentUser;
    const searchSLODefinitions = new SearchSLODefinitions(esClient, logger, spaceId, settings);

    return await searchSLODefinitions.execute(params?.query ?? {});
  },
});
