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

export const inspectSLORoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_inspect',
  options: { access: 'internal' },
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
    const spaceId = await getSpaceId(plugins, request);
    const basePath = corePlugins.http.basePath;
    const core = await context.core;
    const scopedClusterClient = core.elasticsearch.client;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const username = core.security.authc.getCurrentUser()?.username!;
    const soClient = core.savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);

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
      username
    );

    return await createSLO.inspect(params.body);
  },
});
