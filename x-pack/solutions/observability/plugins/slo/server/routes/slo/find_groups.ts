/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findSLOGroupsParamsSchema } from '@kbn/slo-schema';
import { FindSLOGroups } from '../../services';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { getSpaceId } from './utils/get_space_id';

export const findSLOGroupsRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/_groups',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findSLOGroupsParamsSchema,
  handler: async ({ context, request, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const spaceId = await getSpaceId(plugins, request);
    const soClient = (await context.core).savedObjects.client;
    const coreContext = context.core;
    const esClient = (await coreContext).elasticsearch.client.asCurrentUser;
    const findSLOGroups = new FindSLOGroups(esClient, soClient, logger, spaceId);
    return await findSLOGroups.execute(params?.query ?? {});
  },
});
