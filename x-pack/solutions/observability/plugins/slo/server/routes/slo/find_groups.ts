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

export const findSLOGroupsRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slos/_groups',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findSLOGroupsParamsSchema,
  handler: async ({ request, logger, params, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { scopedClusterClient, spaceId, settingsRepository } = await getScopedClients({
      request,
      logger,
    });

    const settings = await settingsRepository.get();

    const findSLOGroups = new FindSLOGroups(scopedClusterClient, settings, logger, spaceId);
    return await findSLOGroups.execute(params?.query ?? {});
  },
});
