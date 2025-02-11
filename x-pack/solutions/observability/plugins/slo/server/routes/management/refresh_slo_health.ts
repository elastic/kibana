/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { refreshSLOHealthParamsSchema } from '@kbn/slo-schema';
import { ComputeSLOHealth } from '../../services/management/compute_slo_health';
import { RefreshSLOHealth } from '../../services/management/refresh_slo_health';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from '../slo/utils/assert_platinum_license';

export const refreshSLOHealthRoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/management/health/_refresh',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: refreshSLOHealthParamsSchema,
  handler: async ({ context, request, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const soClient = coreContext.savedObjects.client;

    const refreshSLOHealth = new RefreshSLOHealth(new ComputeSLOHealth(esClient, soClient, logger));

    return await refreshSLOHealth.execute(params?.query ?? {});
  },
});
