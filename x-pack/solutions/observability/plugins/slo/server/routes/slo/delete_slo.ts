/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteSLOParamsSchema } from '@kbn/slo-schema';
import {
  DefaultSummaryTransformManager,
  DefaultTransformManager,
  DeleteSLO,
  KibanaSavedObjectsSLORepository,
} from '../../services';
import { DefaultSummaryTransformGenerator } from '../../services/summary_transform_generator/summary_transform_generator';
import { createTransformGenerators } from '../../services/transform_generators';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { getSpaceId } from './utils/get_space_id';

export const deleteSLORoute = createSloServerRoute({
  endpoint: 'DELETE /api/observability/slos/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: deleteSLOParamsSchema,
  handler: async ({ request, response, context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);
    const dataViews = await plugins.dataViews.start();

    const sloContext = await context.slo;
    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const soClient = core.savedObjects.client;

    const alerting = await plugins.alerting.start();
    const rulesClient = await alerting.getRulesClientWithRequest(request);

    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);

    const transformGenerators = createTransformGenerators(
      spaceId,
      dataViewsService,
      sloContext.isServerless
    );
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
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

    const deleteSLO = new DeleteSLO(
      repository,
      transformManager,
      summaryTransformManager,
      esClient,
      scopedClusterClient,
      rulesClient
    );

    await deleteSLO.execute(params.path.id);
    return response.noContent();
  },
});
