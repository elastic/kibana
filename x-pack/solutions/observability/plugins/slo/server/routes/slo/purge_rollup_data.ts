/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkPurgeRollupSchema } from '@kbn/slo-schema';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { BulkPurgeRollupData } from '../../services/bulk_purge_rollup_data';

export const bulkPurgeRollupRoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_bulk_purge_rollup 2023-10-31',
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: bulkPurgeRollupSchema,
  handler: async ({ request, context, params, logger, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { repository } = await getScopedClients({ request, logger });

    const core = await context.core;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const purgeRollupData = new BulkPurgeRollupData(esClient, repository);

    return purgeRollupData.execute(params.body);
  },
});
