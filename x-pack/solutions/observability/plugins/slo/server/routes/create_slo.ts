/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { createSLOParamsSchema } from '@kbn/slo-schema';
import { CreateSLO } from '../services';
import { createSloServerRoute } from './utils/create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const createSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos 2023-10-31',
  options: {
    access: 'public',
    summary: 'Create an SLO',
    description:
      'You must have `all` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.',
    operationId: 'createSloOp',
    oasOperationObject: () => path.join(__dirname, 'examples/create_slo.yaml'),
  },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: createSLOParamsSchema,
  handler: async ({
    context,
    params,
    logger,
    request,
    plugins,
    corePlugins,
    getScopedClients,
    commonResourcesInstalled,
  }) => {
    await assertPlatinumLicense(plugins);
    await commonResourcesInstalled;

    const {
      scopedClusterClient,
      internalSoClient,
      spaceId,
      repository,
      transformManager,
      summaryTransformManager,
      telemetry,
    } = await getScopedClients({ request, logger });

    const core = await context.core;
    const userId = core.security.authc.getCurrentUser()?.username!;
    const basePath = corePlugins.http.basePath;

    const createSLO = new CreateSLO(
      scopedClusterClient,
      repository,
      internalSoClient,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId,
      basePath,
      userId,
      telemetry
    );

    return await createSLO.execute(params.body);
  },
});
