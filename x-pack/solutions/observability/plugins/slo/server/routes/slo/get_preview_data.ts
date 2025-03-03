/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPreviewDataParamsSchema } from '@kbn/slo-schema';
import { GetPreviewData } from '../../services/get_preview_data';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { getSpaceId } from './utils/get_space_id';

export const getPreviewData = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_preview',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getPreviewDataParamsSchema,
  handler: async ({ request, context, params, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);
    const dataViews = await plugins.dataViews.start();

    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);
    const service = new GetPreviewData(esClient, spaceId, dataViewsService);
    return await service.execute(params.body);
  },
});
