/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const getSloSettingsRoute = createSloServerRoute({
  endpoint: 'GET /internal/slo/settings',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  handler: async ({ plugins, request, logger, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { settingsRepository } = await getScopedClients({
      request,
      logger,
    });

    return await settingsRepository.get();
  },
});
