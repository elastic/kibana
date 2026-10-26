/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { deleteSLOInstancesParamsSchema } from '@kbn/slo-schema';
import { DeleteSLOInstances } from '../services';
import { createSloServerRoute } from './utils/create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const deleteSloInstancesRoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_delete_instances 2023-10-31',
  options: {
    access: 'public',
    summary: 'Batch delete SLO instances',
    description:
      'The deletion occurs for the specified list of `sloId` and `instanceId`. You must have `all` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.',
    operationId: 'deleteSloInstancesOp',
    oasOperationObject: () => path.join(__dirname, 'examples/delete_instances.yaml'),
  },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: deleteSLOInstancesParamsSchema,
  handler: async ({ request, logger, response, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { scopedClusterClient } = await getScopedClients({ request, logger });

    const deleteSloInstances = new DeleteSLOInstances(scopedClusterClient.asCurrentUser);
    await deleteSloInstances.execute(params.body);

    return response.noContent();
  },
});
