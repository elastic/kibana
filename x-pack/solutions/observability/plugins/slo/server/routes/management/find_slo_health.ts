/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findSLOHealthParamsSchema } from '@kbn/slo-schema';
import { executeWithErrorHandler } from '../../errors';
import { FindSLOHealth } from '../../services/management/find_health';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from '../slo/utils/assert_platinum_license';
import { getSpaceId } from '../slo/utils/get_space_id';

export const findSLOHealthRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/management/health',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findSLOHealthParamsSchema,
  handler: async ({ context, request, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);
    const [spaceId, coreContext] = await Promise.all([getSpaceId(plugins, request), context.core]);

    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const findSLOHealth = new FindSLOHealth(esClient, spaceId);

    return await executeWithErrorHandler(() => findSLOHealth.execute(params?.query ?? {}));
  },
});
