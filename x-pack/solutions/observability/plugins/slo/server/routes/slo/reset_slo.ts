/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resetSLOParamsSchema } from '@kbn/slo-schema';
import { ResetSLO } from '../../services/reset_slo';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const resetSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/_reset 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: resetSLOParamsSchema,
  handler: async ({ params, logger, request, plugins, corePlugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient, spaceId, repository, transformManager, summaryTransformManager } =
      await getScopedClients({ request, logger });

    const basePath = corePlugins.http.basePath;

    const resetSLO = new ResetSLO(
      scopedClusterClient,
      repository,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId,
      basePath
    );

    return await resetSLO.execute(params.path.id);
  },
});
