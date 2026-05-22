/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { findCompositeSLOParamsSchema } from '@kbn/slo-schema';
import type { Paginated } from '@kbn/slo-schema';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../../common/constants';
import type { CompositeSLODefinition } from '../../../domain/models';
import type { CompositeSLORepository } from '../../../services';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

interface FindCompositeSloParams {
  spaceId: string;
  search: string | undefined;
  tags: string[];
  statusFilter: string[];
  sortBy: 'name' | 'createdAt' | 'updatedAt' | undefined;
  sortDirection: 'asc' | 'desc' | undefined;
  page: number;
  perPage: number;
}

interface FindCompositeSloDeps {
  compositeSloRepository: CompositeSLORepository;
  esClient: ElasticsearchClient;
}

/**
 * Reads from the composite summary index for filter/sort/search/paginate, then looks up the
 * full SO definitions for the page's IDs. The summary doc denormalises the fields needed for
 * filtering (spaceId, name, tags, status) but the response shape is the SO definition, so we
 * always lookup definitions for the page (bounded by perPage).
 *
 * Composites without a persisted summary doc (e.g. a still-bootstrapping deployment from a
 * pre-inline-persist build) will not appear here until the background task runs.
 */
async function findCompositeSlos(
  {
    spaceId,
    search,
    tags,
    statusFilter,
    sortBy,
    sortDirection,
    page,
    perPage,
  }: FindCompositeSloParams,
  { compositeSloRepository, esClient }: FindCompositeSloDeps
): Promise<Paginated<CompositeSLODefinition>> {
  const filters: QueryDslQueryContainer[] = [{ term: { spaceId } }];
  if (search) {
    filters.push({
      simple_query_string: {
        query: search,
        fields: ['compositeSlo.name'],
        default_operator: 'AND',
      },
    });
  }
  if (tags.length > 0) {
    filters.push({ terms: { 'compositeSlo.tags': tags } });
  }
  if (statusFilter.length > 0) {
    filters.push({ terms: { status: statusFilter } });
  }

  const sortField =
    sortBy === 'name' ? 'compositeSlo.name.keyword' : `compositeSlo.${sortBy ?? 'createdAt'}`;
  const order = sortDirection ?? 'desc';

  const response = await esClient.search<{ compositeSlo: { id: string } }>({
    index: COMPOSITE_SUMMARY_INDEX_NAME,
    from: (page - 1) * perPage,
    size: perPage,
    track_total_hits: true,
    query: { bool: { filter: filters } },
    sort: [{ [sortField]: { order } }],
    _source: ['compositeSlo.id'],
  });

  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  const compositeIds = response.hits.hits
    .map((hit) => hit._source?.compositeSlo.id)
    .filter((id): id is string => typeof id === 'string');

  if (compositeIds.length === 0) {
    return { page, perPage, total, results: [] };
  }

  const definitions = await compositeSloRepository.findAllByIds(compositeIds);
  const definitionsById = new Map(definitions.map((d) => [d.id, d]));

  // Preserve the order returned by the ES search (which honours the sort).
  const results = compositeIds
    .map((id) => definitionsById.get(id))
    .filter((d): d is CompositeSLODefinition => d !== undefined);

  return { page, perPage, total, results };
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

    const { scopedClusterClient, compositeSloRepository, spaceId } = await getScopedClients({
      request,
      logger,
    });

    const query = params?.query ?? {};
    const page = query.page ? Number(query.page) : 1;
    const perPage = query.perPage ? Number(query.perPage) : 25;
    const tags = query.tags ? query.tags.split(',').map((tag) => tag.trim()) : [];
    const statusFilter = query.status ?? [];

    return await findCompositeSlos(
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
        compositeSloRepository,
        esClient: scopedClusterClient.asCurrentUser,
      }
    );
  },
});
