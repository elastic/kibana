/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOGroupedStatsParamsSchema } from '@kbn/slo-schema';
import { GetSLOGroupedStats } from '../../services/get_slo_grouped_stats';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const getSLOGroupedStatsRoute = createSloServerRoute({
  endpoint: 'POST /internal/slos/_grouped_stats',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSLOGroupedStatsParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient, spaceId, settingsRepository } = await getScopedClients({
      request,
      logger,
    });

    const settings = await settingsRepository.get();

    const sloGroupedStats = new GetSLOGroupedStats(scopedClusterClient, spaceId, settings);

    return await sloGroupedStats.execute(params.body);
  },
});
