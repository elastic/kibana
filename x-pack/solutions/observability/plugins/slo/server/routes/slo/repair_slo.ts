/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { repairParamsSchema } from '@kbn/slo-schema';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { RepairSLO } from '../../services/repair_slo';

export const repairSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_repair 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: repairParamsSchema,
  handler: async ({ request, response, params, logger, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { dataViewsService, soClient, scopedClusterClient } = await getScopedClients({
      request,
      logger,
    });

    await assertPlatinumLicense(plugins);

    const repairSlo = new RepairSLO(logger, soClient, scopedClusterClient, dataViewsService);
    await repairSlo.execute(params.body);
    return response.noContent();
  },
});
