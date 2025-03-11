/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchSLOHealthParamsSchema } from '@kbn/slo-schema';
import { GetSLOHealth, KibanaSavedObjectsSLORepository } from '../../services';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const fetchSloHealthRoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_health',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: fetchSLOHealthParamsSchema,
  handler: async ({ context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const soClient = core.savedObjects.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

    const getSLOHealth = new GetSLOHealth(esClient, scopedClusterClient, repository);

    return await getSLOHealth.execute(params.body);
  },
});
