/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { badRequest } from '@hapi/boom';
import { bulkSnapshotParamsSchema } from '@kbn/slo-schema';
import { SnapshotService } from '../services/snapshot_service';
import { createSloServerRoute } from './utils/create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const bulkSnapshotRoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_bulk_snapshot 2023-10-31',
  options: {
    access: 'public',
    summary: 'Compute SLO instance summaries in bulk at a point in time',
    description:
      "Compute the summary of multiple SLO instances at a given point in time. The endpoint is synchronous and returns results directly. Each result contains either a summary (on success) or a per-instance error. The list of requests is limited to 100 entries. When `instanceId` is omitted or set to `'*'`, the API returns a result for each matching instance (up to 1000 per SLO). You must have the `read` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.",
    operationId: 'bulkSnapshotOp',
    availability: { since: '9.6.0', stability: 'stable' },
    oasOperationObject: () => path.join(__dirname, 'examples/bulk_snapshot.yaml'),
  },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: bulkSnapshotParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    const { at, requests } = params.body;

    if (requests.length > 100) {
      throw badRequest('`requests` is limited to 100 entries');
    }

    if (requests.length === 0) {
      return { at: at.toISOString(), results: [] };
    }

    const [{ scopedClusterClient, spaceId, repository }] = await Promise.all([
      getScopedClients({ request, logger }),
      assertPlatinumLicense(plugins),
    ]);

    const service = new SnapshotService(scopedClusterClient.asCurrentUser, repository, spaceId);
    return service.bulkCompute(at, requests);
  },
});
