/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SearchResponse, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { unflattenObject } from '@kbn/object-utils';

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
 * Refresh option for bulk writes against the latest entities index.
 *
 * - `'wait_for'` (default): block until the next scheduled refresh fires
 *   (typically <1s). Read-your-writes guaranteed on subsequent searches.
 *   Only requires `write` privilege.
 * - `false`: return immediately; the doc becomes searchable on the next
 *   natural refresh. Stale reads possible for ~1s. Only requires `write`.
 *
 * `true` is intentionally not supported: forcing a refresh requires the
 * `indices:admin/refresh/unpromotable` action.
 *
 * Caller guidance: UI routes rely on the default so the immediate refetch
 * sees the new state. Bulk callers (CSV upload, automated maintainer) pass
 * `false` to avoid the per-write refresh wait.
 */
export type RefreshOption = boolean | 'wait_for';

/**
 * Bulk updates entity documents by pre-computed _id.
 * Uses retry_on_conflict to handle concurrent modifications.
 */
export const bulkUpdateEntityDocs = (
  esClient: ElasticsearchClient,
  params: {
    index: string;
    updates: BulkFieldUpdate[];
    refresh?: RefreshOption;
  }
): Promise<BulkResponse> => {
  const { index, updates, refresh = 'wait_for' } = params;
  const operations = updates.flatMap(({ docId, doc }) => [
    {
      update: {
        _index: index,
        _id: docId,
        retry_on_conflict: RETRY_ON_CONFLICT,
      },
    },
    { doc: unflattenObject(doc) },
  ]);

  return esClient.bulk({ operations, refresh });
};
