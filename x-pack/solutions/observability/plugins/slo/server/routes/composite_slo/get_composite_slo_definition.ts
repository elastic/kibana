/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { GetCompositeSLODefinition } from '../../services';
import { createCompositeSloServerRoute } from './create_composite_slo_server_route';

export const getCompositeSLODefinitionRoute = createCompositeSloServerRoute({
  endpoint: 'GET /api/observability/slo_composites/_definitions/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getCompositeSLOParamsSchema,
  handler: async ({ params, logger, request, getScopedClients }) => {
    const { compositeRepository } = await getScopedClients({ request, logger });
    const getCompositeSLODefinition = new GetCompositeSLODefinition(compositeRepository);
    return await getCompositeSLODefinition.execute(params.path.id);
  },
});
