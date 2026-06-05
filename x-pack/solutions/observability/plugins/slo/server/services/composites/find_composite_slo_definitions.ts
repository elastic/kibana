/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { FindCompositeSLODefinitionsParams, Paginated } from '@kbn/slo-schema';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../common/constants';
import type { CompositeSLODefinition } from '../../domain/models';
import type { CompositeSLORepository } from './composite_slo_repository';

interface Dependencies {
  spaceId: string;
  compositeRepository: CompositeSLORepository;
  esClient: ElasticsearchClient;
}

export async function findCompositeSloDefinitions(
  {
    search,
    tags = [],
    status = [],
    sortBy = 'createdAt',
    sortDirection = 'desc',
    page = 1,
    perPage = 25,
  }: FindCompositeSLODefinitionsParams,
  { spaceId, compositeRepository, esClient }: Dependencies
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

  if (status.length > 0) {
    filters.push({ terms: { status } });
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

  const definitions = await compositeRepository.findAllByIds(compositeIds);
  const definitionsById = new Map(definitions.map((d) => [d.id, d]));

  // Preserve the order returned by the ES search (which honours the sort).
  const results = compositeIds
    .map((id) => definitionsById.get(id))
    .filter((d): d is CompositeSLODefinition => d !== undefined);

  return { page, perPage, total, results };
}
