/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSLOParamsSchema } from '@kbn/slo-schema';
import { CreateSLO } from '../../services';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const inspectSLORoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_inspect',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: createSLOParamsSchema,
  handler: async ({ context, params, logger, request, plugins, corePlugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const {
      scopedClusterClient,
      internalSoClient,
      spaceId,
      repository,
      transformManager,
      summaryTransformManager,
    } = await getScopedClients({ request, logger });

    const core = await context.core;
    const basePath = corePlugins.http.basePath;
    const username = core.security.authc.getCurrentUser()?.username!;

    const createSLO = new CreateSLO(
      scopedClusterClient,
      repository,
      internalSoClient,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId,
      basePath,
      username
    );

    return await createSLO.inspect(params.body);
  },
});
