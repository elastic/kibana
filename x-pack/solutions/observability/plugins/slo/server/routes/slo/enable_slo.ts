/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { manageSLOParamsSchema } from '@kbn/slo-schema';
import { ManageSLO } from '../../services/manage_slo';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const enableSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/enable 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: manageSLOParamsSchema,
  handler: async ({ context, response, request, params, logger, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { repository, transformManager, summaryTransformManager } = await getScopedClients({
      request,
      logger,
    });

    const core = await context.core;
    const userId = core.security.authc.getCurrentUser()?.username!;
    const manageSLO = new ManageSLO(repository, transformManager, summaryTransformManager, userId);

    await manageSLO.enable(params.path.id);

    return response.noContent();
  },
});
