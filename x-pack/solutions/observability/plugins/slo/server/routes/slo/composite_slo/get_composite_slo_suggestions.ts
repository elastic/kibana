/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetCompositeSLOSuggestions } from '../../../services/composites/get_composite_slo_suggestions';
import { createCompositeSloServerRoute } from './create_composite_slo_server_route';

export const getCompositeSLOSuggestionsRoute = createCompositeSloServerRoute({
  endpoint: 'GET /internal/observability/slo_composites/suggestions',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  handler: async ({ context, request, logger, plugins, getScopedClients }) => {
    const { soClient } = await getScopedClients({ request, logger });

    const service = new GetCompositeSLOSuggestions(soClient);
    return await service.execute();
  },
});
