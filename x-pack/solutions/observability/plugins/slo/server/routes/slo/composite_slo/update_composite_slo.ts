/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { DefaultBurnRatesClient } from '../../../services/burn_rates_client';
import { persistCompositeSummaryDoc } from '../../../services/composite_summary_writer';
import { DefaultSummaryClient } from '../../../services/summary_client';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

export const updateCompositeSLORoute = createSloServerRoute({
  endpoint: 'PUT /api/observability/slo_composites/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: updateCompositeSLOParamsSchema,
  handler: async ({ context, params, logger, request, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient, repository, compositeSloRepository, spaceId } =
      await getScopedClients({
        request,
        logger,
      });

    const existing = await compositeSloRepository.findById(params.path.id);

    const core = await context.core;
    const userId = core.security.authc.getCurrentUser()?.username;

    const updated = {
      ...existing,
      ...params.body,
      updatedAt: new Date().toISOString(),
      updatedBy: userId ?? existing.updatedBy,
    };

    const result = await compositeSloRepository.update(updated);

    const burnRatesClient = new DefaultBurnRatesClient(scopedClusterClient.asCurrentUser);
    const summaryClient = new DefaultSummaryClient(
      scopedClusterClient.asCurrentUser,
      burnRatesClient
    );
    await persistCompositeSummaryDoc({
      esClient: scopedClusterClient.asCurrentUser,
      summaryClient,
      sloDefinitionRepository: repository,
      logger,
      spaceId,
      compositeSlo: result,
    });

    return result;
  },
});
