/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resetSLOParamsSchema } from '@kbn/slo-schema';
import {
  DefaultSummaryTransformManager,
  DefaultTransformManager,
  KibanaSavedObjectsSLORepository,
} from '../../services';
import { ResetSLO } from '../../services/reset_slo';
import { DefaultSummaryTransformGenerator } from '../../services/summary_transform_generator/summary_transform_generator';
import { createTransformGenerators } from '../../services/transform_generators';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { getSpaceId } from './utils/get_space_id';

export const resetSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/{id}/_reset 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: resetSLOParamsSchema,
  handler: async ({ context, request, params, logger, plugins, corePlugins }) => {
    await assertPlatinumLicense(plugins);

    const sloContext = await context.slo;
    const dataViews = await plugins.dataViews.start();
    const spaceId = await getSpaceId(plugins, request);
    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const soClient = core.savedObjects.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const basePath = corePlugins.http.basePath;

    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

    const transformGenerators = createTransformGenerators(
      spaceId,
      dataViewsService,
      sloContext.isServerless
    );
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

    const resetSLO = new ResetSLO(
      esClient,
      scopedClusterClient,
      repository,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId,
      basePath
    );

    return await resetSLO.execute(params.path.id);
  },
});
