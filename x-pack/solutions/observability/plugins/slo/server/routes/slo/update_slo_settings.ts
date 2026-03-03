/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { putSLOServerlessSettingsParamsSchema, putSLOSettingsParamsSchema } from '@kbn/slo-schema';
import { assign } from 'lodash';
import { DEFAULT_SETTINGS } from '../../services/slo_settings_repository';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const updateSloSettings = (isServerless?: boolean) =>
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
      const { settingsRepository } = await getScopedClients({
        request,
        logger,
      });

      return await settingsRepository.save(assign({}, DEFAULT_SETTINGS, params.body));
    },
  });
