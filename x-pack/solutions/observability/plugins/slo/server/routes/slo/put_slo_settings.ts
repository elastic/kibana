/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PutSLOSettingsParams,
  putSLOServerlessSettingsParamsSchema,
  putSLOSettingsParamsSchema,
} from '@kbn/slo-schema';
import { storeSloSettings } from '../../services/slo_settings';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const putSloSettings = (isServerless?: boolean) =>
  createSloServerRoute({
    endpoint: 'PUT /internal/slo/settings',
    options: { access: 'internal' },
    security: {
      authz: {
        requiredPrivileges: ['slo_write'],
      },
    },
    params: isServerless ? putSLOServerlessSettingsParamsSchema : putSLOSettingsParamsSchema,
    handler: async ({ request, logger, params, plugins, getScopedClients }) => {
      await assertPlatinumLicense(plugins);
      const { soClient } = await getScopedClients({
        request,
        logger,
      });

      return await storeSloSettings(soClient, params.body as PutSLOSettingsParams);
    },
  });
