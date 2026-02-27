/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSLOBurnRatesParamsSchema } from '@kbn/slo-schema';
import { getBurnRates } from '../../services/get_burn_rates';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const getSloBurnRates = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/{id}/_burn_rates',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSLOBurnRatesParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient, soClient, spaceId } = await getScopedClients({
      request,
      logger,
    });

    const { instanceId, windows, remoteName } = params.body;

    return await getBurnRates({
      instanceId,
      spaceId,
      windows,
      remoteName,
      sloId: params.path.id,
      services: {
        soClient,
        esClient: scopedClusterClient.asCurrentUser,
        logger,
      },
    });
  },
});
