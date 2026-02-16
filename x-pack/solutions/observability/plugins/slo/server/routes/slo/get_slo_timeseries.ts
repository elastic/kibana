/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE, getSLOTimeseriesParamsSchema } from '@kbn/slo-schema';
import { SloTimeseriesClient } from '../../services/slo_timeseries_client';
import { SLODefinitionClient } from '../../services/slo_definition_client';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const getSloTimeseriesRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/{id}/timeseries 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSLOTimeseriesParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient, spaceId, repository } = await getScopedClients({
      request,
      logger,
    });

    const definitionClient = new SLODefinitionClient(
      repository,
      scopedClusterClient.asCurrentUser,
      logger
    );
    const timeseriesClient = new SloTimeseriesClient(scopedClusterClient.asCurrentUser);

    const { from, to, instanceId, remoteName, bucketInterval, includeRaw } = params.query;

    const { slo } = await definitionClient.execute(params.path.id, spaceId, remoteName);

    return await timeseriesClient.fetch({
      slo,
      instanceId: instanceId ?? ALL_VALUE,
      from,
      to,
      remoteName,
      bucketInterval,
      includeRaw: includeRaw === 'true',
    });
  },
});
