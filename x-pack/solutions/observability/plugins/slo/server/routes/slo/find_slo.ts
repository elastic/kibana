/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findSLOParamsSchema } from '@kbn/slo-schema';
import { FindSLO } from '../../services';
import { DefaultSummarySearchClient } from '../../services/summary_search_client/summary_search_client';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const findSLORoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findSLOParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient, repository, soClient, spaceId } = await getScopedClients({
      request,
      logger,
    });

    const summarySearchClient = new DefaultSummarySearchClient(
      scopedClusterClient,
      soClient,
      logger,
      spaceId
    );

    const findSLO = new FindSLO(repository, summarySearchClient);

    return await findSLO.execute(params?.query ?? {});
  },
});
