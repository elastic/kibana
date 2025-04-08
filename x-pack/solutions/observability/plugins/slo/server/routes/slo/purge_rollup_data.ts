/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkPurgeRollupSchema } from '@kbn/slo-schema';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { PurgeRollupData } from '../../services/purge_rollup_data';

export const purgeRollupDataRoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_purge_rollup 2023-10-31',
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: bulkPurgeRollupSchema,
  handler: async ({ request, response, context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const core = await context.core;
    const esClient = core.elasticsearch.client.asCurrentUser;

    const purgeRollupData = new PurgeRollupData(esClient);

    Promise.all(
      params.body.ids.map((sloId) => {
        console.log(purgeRollupData.execute(sloId));
      })
    );

    return response.noContent();
  },
});
