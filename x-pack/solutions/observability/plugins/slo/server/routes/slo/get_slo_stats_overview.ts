/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOStatsOverviewParamsSchema } from '@kbn/slo-schema';
import { GetSLOStatsOverview } from '../../services/get_slo_stats_overview';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const getSLOStatsOverview = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/overview',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSLOStatsOverviewParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient, spaceId, soClient, rulesClient, racClient } =
      await getScopedClients({
        request,
        logger,
      });

    const slosOverview = new GetSLOStatsOverview(
      soClient,
      scopedClusterClient.asCurrentUser,
      spaceId,
      logger,
      rulesClient,
      racClient
    );

    return await slosOverview.execute(params?.query ?? {});
  },
});
