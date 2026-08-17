/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { MAX_ALERTS_PER_TRIGGER } from '../../../../../../common/workflows/triggers';

export interface PreviousStatus {
  id: string;
  previousStatus: string;
}

const resolveIndex = (index: string | string[]): string =>
  Array.isArray(index) ? index.join(',') : index;

export const extractWorkflowStatus = (source: unknown): string => {
  const v = (source as Record<string, unknown> | null | undefined)?.[ALERT_WORKFLOW_STATUS];
  return typeof v === 'string' ? v : 'open';
};

export const prefetchPreviousStatusesByIds = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[]
): Promise<PreviousStatus[]> => {
  const mgetResponse = await esClient.mget({
    index: resolveIndex(index),
    ids,
    _source_includes: [ALERT_WORKFLOW_STATUS],
  });
  const results: PreviousStatus[] = [];
  for (const doc of mgetResponse.docs) {
    if ('found' in doc && doc.found && doc._id != null) {
      results.push({ id: doc._id, previousStatus: extractWorkflowStatus(doc._source) });
    }
  }
  return results;
};

export const prefetchPreviousStatusesByQuery = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  query: estypes.QueryDslQueryContainer,
  runtimeMappings?: estypes.MappingRuntimeFields
): Promise<{ ids: string[]; previousStatuses: PreviousStatus[]; truncated: boolean }> => {
  const searchResponse = await esClient.search({
    index: resolveIndex(index),
    query: { bool: { filter: query } },
    _source_includes: [ALERT_WORKFLOW_STATUS],
    size: MAX_ALERTS_PER_TRIGGER,
    track_total_hits: MAX_ALERTS_PER_TRIGGER + 1,
    ignore_unavailable: true,
    ...(runtimeMappings != null && Object.keys(runtimeMappings).length > 0
      ? { runtime_mappings: runtimeMappings }
      : {}),
  });
  const totalHits = searchResponse.hits.total;
  const totalCount = typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;
  const truncated = totalCount > MAX_ALERTS_PER_TRIGGER;
  const ids: string[] = [];
  const previousStatuses: PreviousStatus[] = [];
  for (const hit of searchResponse.hits.hits) {
    if (hit._id != null) {
      ids.push(hit._id);
      previousStatuses.push({ id: hit._id, previousStatus: extractWorkflowStatus(hit._source) });
    }
  }
  return { ids, previousStatuses, truncated };
};
