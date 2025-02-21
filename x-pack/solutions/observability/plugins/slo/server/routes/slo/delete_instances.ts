/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteSLOInstancesParamsSchema } from '@kbn/slo-schema';
import { DeleteSLOInstances } from '../../services';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const deleteSloInstancesRoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_delete_instances 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: deleteSLOInstancesParamsSchema,
  handler: async ({ response, context, params, plugins }) => {
    await assertPlatinumLicense(plugins);

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const deleteSloInstances = new DeleteSLOInstances(esClient);

    await deleteSloInstances.execute(params.body);
    return response.noContent();
  },
});
