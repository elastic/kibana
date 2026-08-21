/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import { ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import {
  MAX_ALERTS_PER_TRIGGER,
  WORKFLOW_STATUS_VALUES,
} from '../../../../../../common/workflows/triggers';
import type { WorkflowStatus } from '../../../../../../common/workflows/triggers';

export interface PreviousStatus {
  id: string;
  previousStatus: WorkflowStatus;
}

const resolveIndex = (index: string | string[]): string =>
  Array.isArray(index) ? index.join(',') : index;

const isWorkflowStatus = (v: unknown): v is WorkflowStatus =>
  typeof v === 'string' && (WORKFLOW_STATUS_VALUES as readonly string[]).includes(v);

export const extractWorkflowStatus = (source: unknown): WorkflowStatus | undefined => {
  const v = (source as Record<string, unknown> | null | undefined)?.[ALERT_WORKFLOW_STATUS];
  return isWorkflowStatus(v) ? v : undefined;
};

export const prefetchPreviousStatusesByIds = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[]
): Promise<{ previousStatuses: PreviousStatus[]; idToIndex: Map<string, string> }> => {
  // Use search (not mget) so ignore_unavailable: true tolerates missing indices
  // (e.g. the adhoc attack-discovery index may not exist yet).
  const searchResponse = await esClient.search({
    index: resolveIndex(index),
    query: { terms: { _id: ids } },
    _source_includes: [ALERT_WORKFLOW_STATUS],
    size: ids.length,
    ignore_unavailable: true,
  });
  const previousStatuses: PreviousStatus[] = [];
  const idToIndex = new Map<string, string>();
  for (const hit of searchResponse.hits.hits) {
    if (hit._id != null) {
      const previousStatus = extractWorkflowStatus(hit._source);
      if (previousStatus !== undefined) {
        previousStatuses.push({ id: hit._id, previousStatus });
      }
      if (hit._index != null) {
        idToIndex.set(hit._id, hit._index);
      }
    }
  }
  return { previousStatuses, idToIndex };
};

export const fetchAlertIdToIndex = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[]
): Promise<Map<string, string>> => {
  const searchResponse = await esClient.search({
    index: resolveIndex(index),
    query: { terms: { _id: ids } },
    _source: false,
    size: Math.min(ids.length, MAX_ALERTS_PER_TRIGGER),
    ignore_unavailable: true,
  });
  const idToIndex = new Map<string, string>();
  for (const hit of searchResponse.hits.hits) {
    if (hit._id != null && hit._index != null) {
      idToIndex.set(hit._id, hit._index);
    }
  }
  return idToIndex;
};

export const prefetchPreviousStatusesByQuery = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  query: estypes.QueryDslQueryContainer,
  runtimeMappings?: estypes.MappingRuntimeFields
): Promise<{
  ids: string[];
  previousStatuses: PreviousStatus[];
  idToIndex: Map<string, string>;
  truncated: boolean;
}> => {
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
  const idToIndex = new Map<string, string>();
  for (const hit of searchResponse.hits.hits) {
    if (hit._id != null) {
      ids.push(hit._id);
      const previousStatus = extractWorkflowStatus(hit._source);
      if (previousStatus !== undefined) {
        previousStatuses.push({ id: hit._id, previousStatus });
      }
      if (hit._index != null) {
        idToIndex.set(hit._id, hit._index);
      }
    }
  }
  return { ids, previousStatuses, idToIndex, truncated };
};
