/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aggregateSLOParamsSchema } from '@kbn/slo-schema';
import { SloAggregationClient } from '../../services/slo_aggregation_client';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const aggregateSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_aggregate 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: aggregateSLOParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient, spaceId, settingsRepository } = await getScopedClients({
      request,
      logger,
    });

    const settings = await settingsRepository.get();
    const aggregationClient = new SloAggregationClient(scopedClusterClient, spaceId, settings);

    return await aggregationClient.aggregate(params.body);
  },
});
