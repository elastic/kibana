/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { repairParamsSchema } from '@kbn/slo-schema';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { RepairSLO } from '../../services/repair_slo';
import { createTransformGenerators } from '../../services/transform_generators';
import { DefaultSummaryTransformManager, DefaultTransformManager } from '../../services';
import { DefaultSummaryTransformGenerator } from '../../services/summary_transform_generator/summary_transform_generator';

export const repairSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_repair',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: repairParamsSchema,
  handler: async ({ request, response, params, logger, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { dataViewsService, scopedClusterClient, spaceId, repository } = await getScopedClients({
      request,
      logger,
    });

    const transformGenerators = createTransformGenerators(spaceId, dataViewsService, false);

    const transformManager = new DefaultTransformManager(
      transformGenerators,
      scopedClusterClient,
      logger
    );

    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      scopedClusterClient,
      logger
    );

    const repairSlo = new RepairSLO(
      logger,
      scopedClusterClient,
      repository,
      transformManager,
      summaryTransformManager
    );
    const results = await repairSlo.execute(params.body);
    return response.multiStatus({ body: results });
  },
});
