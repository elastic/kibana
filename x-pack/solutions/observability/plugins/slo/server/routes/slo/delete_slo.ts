/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteSLOParamsSchema } from '@kbn/slo-schema';
import { DeleteSLO } from '../../services';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const deleteSLORoute = createSloServerRoute({
  endpoint: 'DELETE /api/observability/slos/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: deleteSLOParamsSchema,
  handler: async ({ response, params, logger, request, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const {
      scopedClusterClient,
      repository,
      transformManager,
      summaryTransformManager,
      rulesClient,
    } = await getScopedClients({ request, logger });

    const deleteSLO = new DeleteSLO(
      repository,
      transformManager,
      summaryTransformManager,
      scopedClusterClient,
      rulesClient
    );

    await deleteSLO.execute(params.path.id);
    return response.noContent();
  },
});
