/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateSLOParamsSchema } from '@kbn/slo-schema';
import {
  DefaultSummaryTransformManager,
  DefaultTransformManager,
  KibanaSavedObjectsSLORepository,
  UpdateSLO,
} from '../../services';
import { DefaultSummaryTransformGenerator } from '../../services/summary_transform_generator/summary_transform_generator';
import { createTransformGenerators } from '../../services/transform_generators';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { getSpaceId } from './utils/get_space_id';

export const updateSLORoute = createSloServerRoute({
  endpoint: 'PUT /api/observability/slos/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: updateSLOParamsSchema,
  handler: async ({ context, request, params, logger, plugins, corePlugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);
    const dataViews = await plugins.dataViews.start();

    const sloContext = await context.slo;
    const basePath = corePlugins.http.basePath;
    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const userId = core.security.authc.getCurrentUser()?.username!;

    const soClient = core.savedObjects.client;
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

    const updateSLO = new UpdateSLO(
      repository,
      transformManager,
      summaryTransformManager,
      esClient,
      scopedClusterClient,
      logger,
      spaceId,
      basePath,
      userId
    );

    return await updateSLO.execute(params.path.id, params.body);
  },
});
