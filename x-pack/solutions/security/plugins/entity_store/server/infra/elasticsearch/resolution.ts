/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchResponse, BulkResponse } from '@elastic/elasticsearch/lib/api/types';

const RETRY_ON_CONFLICT = 3;

/**
 * Searches for entities by their entity.id values.
 */
export const searchEntitiesByIds = (
  esClient: ElasticsearchClient,
  params: {
    index: string;
    entityIdField: string;
    entityIds: string[];
    source?: boolean | string[];
  }
): Promise<SearchResponse<Record<string, unknown>>> =>
  esClient.search({
    index: params.index,
    size: params.entityIds.length,
    query: {
      bool: {
        filter: [{ terms: { [params.entityIdField]: params.entityIds } }],
      },
    },
    _source: params.source ?? true,
  });

/**
 * Searches for entities that have resolved_to pointing to any of the given target IDs.
 */
export const searchByResolvedToField = (
  esClient: ElasticsearchClient,
  params: {
    index: string;
    resolvedToField: string;
    targetIds: string[];
    maxSize: number;
    source?: string[];
  }
): Promise<SearchResponse<Record<string, unknown>>> =>
  esClient.search({
    index: params.index,
    size: params.maxSize,
    query: {
      bool: {
        filter: [{ terms: { [params.resolvedToField]: params.targetIds } }],
      },
    },
    _source: params.source ?? true,
  });

/**
 * Searches for a resolution group: the target entity + all aliases pointing to it.
 */
export const searchResolutionGroup = (
  esClient: ElasticsearchClient,
  params: {
    index: string;
    entityIdField: string;
    resolvedToField: string;
    targetId: string;
    maxSize: number;
  }
): Promise<SearchResponse<Record<string, unknown>>> =>
  esClient.search({
    index: params.index,
    size: params.maxSize,
    query: {
      bool: {
        should: [
          { term: { [params.entityIdField]: params.targetId } },
          { term: { [params.resolvedToField]: params.targetId } },
        ],
        minimum_should_match: 1,
      },
    },
    _source: true,
  });

interface BulkFieldUpdate {
  docId: string;
  doc: Record<string, unknown>;
}

/**
 * Bulk updates entity documents by pre-computed _id.
 * Uses retry_on_conflict to handle concurrent modifications.
 */
export const bulkUpdateEntityDocs = (
  esClient: ElasticsearchClient,
  params: {
    index: string;
    updates: BulkFieldUpdate[];
  }
): Promise<BulkResponse> => {
  const operations = params.updates.flatMap(({ docId, doc }) => [
    {
      update: {
        _index: params.index,
        _id: docId,
        retry_on_conflict: RETRY_ON_CONFLICT,
      },
    },
    { doc },
  ]);

  return esClient.bulk({ operations, refresh: true });
};
