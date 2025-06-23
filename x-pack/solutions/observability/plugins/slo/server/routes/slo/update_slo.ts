/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateSLOParamsSchema } from '@kbn/slo-schema';
import { UpdateSLO } from '../../services';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const updateSLORoute = createSloServerRoute({
  endpoint: 'PUT /api/observability/slos/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: updateSLOParamsSchema,
  handler: async ({ context, params, logger, request, plugins, corePlugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient, spaceId, repository, transformManager, summaryTransformManager } =
      await getScopedClients({ request, logger });

    const core = await context.core;
    const basePath = corePlugins.http.basePath;
    const userId = core.security.authc.getCurrentUser()?.username!;

    const updateSLO = new UpdateSLO(
      repository,
      transformManager,
      summaryTransformManager,
      scopedClusterClient,
      logger,
      spaceId,
      basePath,
      userId
    );

    return await updateSLO.execute(params.path.id, params.body);
  },
});
