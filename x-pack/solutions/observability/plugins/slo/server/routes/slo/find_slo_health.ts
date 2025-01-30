/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findSLOHealthParamsSchema } from '@kbn/slo-schema';
import { executeWithErrorHandler } from '../../errors';
import { FindSLOHealth } from '../../services/ops_management/find_health';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { getSpaceId } from './utils/get_space_id';

export const findSLOHealthRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/ops/health 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findSLOHealthParamsSchema,
  handler: async ({ context, request, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const findSLO = new FindSLOHealth(esClient, logger, spaceId);

    return await executeWithErrorHandler(() => findSLO.execute(params?.query ?? {}));
  },
});
