/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSnapshotParamsSchema } from '@kbn/slo-schema';
import { SnapshotService } from '../services/snapshot_service';
import { createSloServerRoute } from './utils/create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const getSnapshotRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/{id}/_snapshot 2023-10-31',
  options: { access: 'public' },
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
    return service.compute(at, id, instanceId);
  },
});
