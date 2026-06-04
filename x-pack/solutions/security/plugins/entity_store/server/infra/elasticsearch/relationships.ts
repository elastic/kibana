/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  QueryDslQueryContainer,
  SearchResponse,
  SortOrder,
} from '@elastic/elasticsearch/lib/api/types';
import {
  RELATIONSHIP_KINDS,
  type RelationshipKind,
  type RelationshipMetadataDoc,
} from '../../../common/domain/entity_metadata/relationship_metadata';

/**
 * Search the entity metadata datastream for relationship records belonging
 * to a single entity, filtered/sorted by the provided params. Implicit
 * `event.action: relationship_observed` filter ensures the read path stays
 * scoped to relationship docs even if the datastream gains other event
 * actions in the future.
 */
export const searchRelationshipMetadata = (
  esClient: ElasticsearchClient,
  params: {
    index: string;
    entityId: string;
    kind?: RelationshipKind;
    target?: string;
    from?: string;
    to?: string;
    sortField: string;
    sortOrder: SortOrder;
    pageOffset: number;
    pageSize: number;
  }
): Promise<SearchResponse<RelationshipMetadataDoc>> => {
  const filter: QueryDslQueryContainer[] = [
    { term: { 'event.action': 'relationship_observed' } },
    { term: { 'entity.id': params.entityId } },
  ];

  if (params.from !== undefined || params.to !== undefined) {
    const range: { gte?: string; lte?: string } = {};
    if (params.from !== undefined) range.gte = params.from;
    if (params.to !== undefined) range.lte = params.to;
    filter.push({ range: { '@timestamp': range } });
  }

  if (params.kind !== undefined && params.target !== undefined) {
    filter.push({
      term: { [`entity.relationships.${params.kind}.target`]: params.target },
    });
  } else if (params.kind !== undefined) {
    filter.push({ exists: { field: `entity.relationships.${params.kind}` } });
  } else if (params.target !== undefined) {
    const target = params.target;
    filter.push({
      bool: {
        should: RELATIONSHIP_KINDS.map((kind) => ({
          term: { [`entity.relationships.${kind}.target`]: target },
        })),
        minimum_should_match: 1,
      },
    });
  }

  return esClient.search<RelationshipMetadataDoc>({
    index: params.index,
    query: { bool: { filter } },
    from: params.pageOffset,
    size: params.pageSize,
    sort: [{ [params.sortField]: params.sortOrder }, { _shard_doc: 'desc' }],
  });
};
