/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { batchGetCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { DefaultBurnRatesClient, DefaultSummaryClient, GetCompositeSLO } from '../../../services';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

export const batchGetCompositeSLORoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slo_composites/_batch_get',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: batchGetCompositeSLOParamsSchema,
  handler: async ({ params, logger, request, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient, repository, compositeSloRepository, spaceId } =
      await getScopedClients({
        request,
        logger,
      });

    const burnRatesClient = new DefaultBurnRatesClient(scopedClusterClient.asCurrentUser);
    const summaryClient = new DefaultSummaryClient(
      scopedClusterClient.asCurrentUser,
      burnRatesClient
    );
    const getCompositeSLO = new GetCompositeSLO(
      compositeSloRepository,
      repository,
      summaryClient,
      scopedClusterClient.asCurrentUser
    );

    return await getCompositeSLO.executeBatch(params.body.ids, spaceId);
  },
});
