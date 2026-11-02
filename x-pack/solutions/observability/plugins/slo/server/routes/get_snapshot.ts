/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { getSnapshotParamsSchema } from '@kbn/slo-schema';
import { SnapshotService } from '../services/snapshot_service';
import { createSloServerRoute } from './utils/create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const getSnapshotRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/{id}/_snapshot 2023-10-31',
  options: {
    access: 'public',
    summary: 'Compute an SLO instance summary at a point in time',
    description:
      "Compute the summary of an SLO at a given point in time. When `instanceId` is provided, returns that instance. When `instanceId` is omitted or set to `'*'`, returns all matching instances (up to 1000). The endpoint is synchronous and returns results directly. You must have the `read` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.",
    operationId: 'getSnapshotOp',
    availability: { since: '9.6.0', stability: 'stable' },
    oasOperationObject: () => path.join(__dirname, 'examples/get_snapshot.yaml'),
  },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSnapshotParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    const { id } = params.path;
    const { at, instanceId } = params.query;

    const [{ scopedClusterClient, spaceId, repository }] = await Promise.all([
      getScopedClients({ request, logger }),
      assertPlatinumLicense(plugins),
    ]);

    const service = new SnapshotService(scopedClusterClient.asCurrentUser, repository, spaceId);
    return service.compute(new Date(at), id, instanceId);
  },
});
