/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findCompositeSLOParamsSchema, findCompositeSLOResponseSchema } from '@kbn/slo-schema';
import { DefaultCompositeSLORepository } from '../../../services/composite_slo_repository';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

export const findCompositeSLORoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slo_composites 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findCompositeSLOParamsSchema,
  handler: async ({ params, logger, request, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { soClient } = await getScopedClients({ request, logger });
    const repository = new DefaultCompositeSLORepository(soClient, logger);

    const query = params?.query ?? {};
    const page = query.page ? Number(query.page) : 1;
    const perPage = query.perPage ? Number(query.perPage) : 25;
    const tags = query.tags ? query.tags.split(',').map((tag) => tag.trim()) : [];

    const result = await repository.search({
      search: query.search,
      pagination: { page, perPage },
      tags,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
    return findCompositeSLOResponseSchema.encode(result);
  },
});
