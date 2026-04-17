/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchCompositeHistoricalSummaryParamsSchema } from '@kbn/slo-schema';
import { CompositeHistoricalSummaryClient, DefaultCompositeSLORepository } from '../../../services';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

export const fetchCompositeHistoricalSummaryRoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slo_composites/_historical_summary',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: fetchCompositeHistoricalSummaryParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { soClient, scopedClusterClient, repository } = await getScopedClients({
      request,
      logger,
    });

    const compositeSloRepository = new DefaultCompositeSLORepository(soClient, logger);
    const client = new CompositeHistoricalSummaryClient(
      scopedClusterClient.asCurrentUser,
      compositeSloRepository,
      repository
    );

    return await client.fetch(params.body);
  },
});
