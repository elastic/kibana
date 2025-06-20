/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSloSettings } from '../../services/slo_settings';
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
  handler: async ({ plugins, getScopedClients, request }) => {
    await assertPlatinumLicense(plugins);
    const { soClient } = await getScopedClients(request);

    return await getSloSettings(soClient);
  },
});
