/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { bulkSnapshotParamsSchema } from '@kbn/slo-schema';
import { BulkSnapshotClient } from '../services/bulk_snapshot_client';
import { createSloServerRoute } from './utils/create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const bulkSnapshotRoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_bulk_snapshot 2023-10-31',
  options: { access: 'public' },
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

    const atDate = new Date(at);
    if (isNaN(atDate.getTime())) {
      throw badRequest('`at` must be a valid ISO datetime string');
    }

    if (requests.length === 0) {
      return { at, results: [] };
    }

    const [{ scopedClusterClient, spaceId, repository }] = await Promise.all([
      getScopedClients({ request, logger }),
      assertPlatinumLicense(plugins),
    ]);

    const client = new BulkSnapshotClient(scopedClusterClient.asCurrentUser, repository, spaceId);
    return client.compute(atDate, requests);
  },
});
