/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findCompositeSLOParamsSchema, findCompositeSLOResponseSchema } from '@kbn/slo-schema';
import {
  DefaultBurnRatesClient,
  DefaultCompositeSLORepository,
  DefaultSummaryClient,
  GetCompositeSLO,
} from '../../../services';
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

    const { soClient, scopedClusterClient, repository } = await getScopedClients({
      request,
      logger,
    });
    const compositeSloRepository = new DefaultCompositeSLORepository(soClient, logger);

    const query = params?.query ?? {};
    const page = query.page ? Number(query.page) : 1;
    const perPage = query.perPage ? Number(query.perPage) : 25;
    const tags = query.tags ? query.tags.split(',').map((tag) => tag.trim()) : [];
    const statusFilter = query.status ? query.status.split(',').map((s) => s.trim()) : [];

    if (statusFilter.length > 0) {
      // Status is a computed field — fetch all definitions matching search/tags, batch-compute
      // summaries, filter by status server-side, then return the correctly paginated slice.
      const allResults = await compositeSloRepository.search({
        search: query.search,
        pagination: { page: 1, perPage: 10000 },
        tags,
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
      });

      const burnRatesClient = new DefaultBurnRatesClient(scopedClusterClient.asCurrentUser);
      const summaryClient = new DefaultSummaryClient(
        scopedClusterClient.asCurrentUser,
        burnRatesClient
      );
      const getCompositeSLO = new GetCompositeSLO(
        compositeSloRepository,
        repository,
        summaryClient
      );

      const allDetails = await getCompositeSLO.executeBatch(allResults.results.map((r) => r.id));

      const matchingIds = new Set(
        allDetails.filter((d) => statusFilter.includes(d.summary.status)).map((d) => d.id)
      );

      const filteredResults = allResults.results.filter((r) => matchingIds.has(r.id));
      const total = filteredResults.length;
      const start = (page - 1) * perPage;
      const pageResults = filteredResults.slice(start, start + perPage);

      return findCompositeSLOResponseSchema.encode({ results: pageResults, total, page, perPage });
    }

    const result = await compositeSloRepository.search({
      search: query.search,
      pagination: { page, perPage },
      tags,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
    return findCompositeSLOResponseSchema.encode(result);
  },
});
