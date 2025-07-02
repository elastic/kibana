/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSLOParamsSchema } from '@kbn/slo-schema';
import {
  CreateSLO,
  DefaultSummaryTransformManager,
  DefaultTransformManager,
  KibanaSavedObjectsSLORepository,
} from '../../services';
import { DefaultSummaryTransformGenerator } from '../../services/summary_transform_generator/summary_transform_generator';
import { createTransformGenerators } from '../../services/transform_generators';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { getSpaceId } from './utils/get_space_id';

export const createSLORoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: createSLOParamsSchema,
  handler: async ({ context, params, logger, request, plugins, corePlugins }) => {
    await assertPlatinumLicense(plugins);

    const sloContext = await context.slo;
    const dataViews = await plugins.dataViews.start();
    const core = await context.core;
    const userId = core.security.authc.getCurrentUser()?.username!;
    const scopedClusterClient = core.elasticsearch.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const soClient = core.savedObjects.client;
    const basePath = corePlugins.http.basePath;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);

    const [spaceId, dataViewsService] = await Promise.all([
      getSpaceId(plugins, request),
      dataViews.dataViewsServiceFactory(soClient, esClient),
    ]);

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
    const createSLO = new CreateSLO(
      esClient,
      scopedClusterClient,
      repository,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId,
      basePath,
      userId
    );

    return await createSLO.execute(params.body);
  },
});
