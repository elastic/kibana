/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { bulkPurgeRollupSchema } from '@kbn/slo-schema';
import { createSloServerRoute } from './utils/create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { BulkPurgeRollupData } from '../services/bulk_purge_rollup_data';

export const bulkPurgeRollupRoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_bulk_purge_rollup 2023-10-31',
  options: {
    access: 'public',
    summary: 'Batch delete rollup and summary data',
    description:
      'The deletion occurs for the specified list of `sloId`. You must have `all` privileges for the **SLOs** feature in the **Observability** section of the Kibana feature privileges.',
    operationId: 'deleteRollupDataOp',
    oasOperationObject: () => path.join(__dirname, 'examples/bulk_purge_rollup.yaml'),
  },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: bulkPurgeRollupSchema,
  handler: async ({ request, context, params, logger, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { repository, scopedClusterClient } = await getScopedClients({ request, logger });
    const purgeRollupData = new BulkPurgeRollupData(scopedClusterClient.asCurrentUser, repository);

    return purgeRollupData.execute(params.body);
  },
});
