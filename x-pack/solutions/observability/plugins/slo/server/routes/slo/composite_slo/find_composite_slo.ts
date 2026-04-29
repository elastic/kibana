/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { findCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { type CompositeSLORepository, DefaultCompositeSLORepository } from '../../../services';
import { fetchCompositeSloSummariesFromIndex } from '../../../services/composite_slo_summary_index';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

async function findFilteredByStatus({
  compositeSloRepository,
  esClient,
  spaceId,
  statusFilter,
  search,
  tags,
  sortBy,
  sortDirection,
  page,
  perPage,
}: {
  compositeSloRepository: CompositeSLORepository;
  esClient: ElasticsearchClient;
  spaceId: string;
  statusFilter: string[];
  search: string | undefined;
  tags: string[];
  sortBy: string | undefined;
  sortDirection: string | undefined;
  page: number;
  perPage: number;
}) {
  const allResults = await compositeSloRepository.search({
    search,
    pagination: { page: 1, perPage: 10000 },
    tags,
    sortBy: sortBy as 'name' | 'createdAt' | 'updatedAt' | undefined,
    sortDirection: sortDirection as 'asc' | 'desc' | undefined,
  });

  const summariesById = await fetchCompositeSloSummariesFromIndex(
    esClient,
    spaceId,
    allResults.results.map((r) => r.id)
  );

  const filtered = allResults.results.filter((r) => {
    const persisted = summariesById.get(r.id);
    return persisted !== undefined && statusFilter.includes(persisted.summary.status);
  });

  const start = (page - 1) * perPage;
  return { results: filtered.slice(start, start + perPage), total: filtered.length, page, perPage };
}

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

    const { soClient, scopedClusterClient, spaceId } = await getScopedClients({
      request,
      logger,
    });
    const compositeSloRepository = new DefaultCompositeSLORepository(soClient, logger);

    const query = params?.query ?? {};
    const page = query.page ? Number(query.page) : 1;
    const perPage = query.perPage ? Number(query.perPage) : 25;
    const tags = query.tags ? query.tags.split(',').map((tag) => tag.trim()) : [];
    const statusFilter = query.status ?? [];

    if (statusFilter.length > 0) {
      return await findFilteredByStatus({
        compositeSloRepository,
        esClient: scopedClusterClient.asCurrentUser,
        spaceId,
        statusFilter,
        search: query.search,
        tags,
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
        page,
        perPage,
      });
    }

    const result = await compositeSloRepository.search({
      search: query.search,
      pagination: { page, perPage },
      tags,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
    return result;
  },
});
