/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetCompositeSLOSuggestions } from '../../../services/get_composite_slo_suggestions';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

export const getCompositeSLOSuggestionsRoute = createSloServerRoute({
  endpoint: 'GET /internal/observability/slo_composites/suggestions',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  handler: async ({ request, logger, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);
    const { soClient } = await getScopedClients({ request, logger });

    const service = new GetCompositeSLOSuggestions(soClient);
    return await service.execute();
  },
});
