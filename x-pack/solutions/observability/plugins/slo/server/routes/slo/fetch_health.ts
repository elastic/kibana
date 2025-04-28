/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchSLOHealthParamsSchema } from '@kbn/slo-schema';
import { GetSLOHealth } from '../../services';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const fetchSloHealthRoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_health',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: fetchSLOHealthParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient, repository } = await getScopedClients({ request, logger });
    const getSLOHealth = new GetSLOHealth(scopedClusterClient, repository);

    return await getSLOHealth.execute(params.body);
  },
});
