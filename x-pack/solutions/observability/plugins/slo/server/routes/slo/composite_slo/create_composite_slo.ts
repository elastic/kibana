/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { DefaultBurnRatesClient } from '../../../services/burn_rates_client';
import { createCompositeSlo } from '../../../services/composites/create_composite_slo';
import { DefaultSummaryClient } from '../../../services/summary_client';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

export const createCompositeSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slo_composites 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: createCompositeSLOParamsSchema,
  handler: async ({ context, params, logger, request, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient, repository, compositeSloRepository, spaceId } =
      await getScopedClients({
        request,
        logger,
      });

    const core = await context.core;
    const userId = core.security.authc.getCurrentUser()?.username ?? 'unknown';

    const burnRatesClient = new DefaultBurnRatesClient(scopedClusterClient.asCurrentUser);
    const summaryClient = new DefaultSummaryClient(
      scopedClusterClient.asCurrentUser,
      burnRatesClient
    );

    return await createCompositeSlo(
      { ...params.body, spaceId, userId },
      {
        esClient: scopedClusterClient.asCurrentUser,
        compositeSloRepository,
        sloDefinitionRepository: repository,
        summaryClient,
        logger,
      }
    );
  },
});
