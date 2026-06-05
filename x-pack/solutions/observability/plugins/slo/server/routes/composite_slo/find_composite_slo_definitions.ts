/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { findCompositeSloDefinitions } from '../../services/composites/find_composite_slo_definitions';
import { createCompositeSloServerRoute } from './create_composite_slo_server_route';

export const findCompositeSLORoute = createCompositeSloServerRoute({
  endpoint: 'GET /api/observability/slo_composites 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findCompositeSLOParamsSchema,
  handler: async ({ params, logger, request, getScopedClients }) => {
    const { scopedClusterClient, compositeRepository, spaceId } = await getScopedClients({
      request,
      logger,
    });

    const query = params?.query ?? {};
    const page = query.page ? Number(query.page) : 1;
    const perPage = query.perPage ? Number(query.perPage) : 25;
    const tags = query.tags ? query.tags.split(',').map((tag) => tag.trim()) : [];
    const statusFilter = query.status ?? [];

    return await findCompositeSloDefinitions(
      {
        spaceId,
        search: query.search,
        tags,
        statusFilter,
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
        page,
        perPage,
      },
      {
        compositeRepository,
        esClient: scopedClusterClient.asCurrentUser,
      }
    );
  },
});
