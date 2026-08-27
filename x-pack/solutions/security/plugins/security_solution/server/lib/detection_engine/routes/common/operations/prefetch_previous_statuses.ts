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

export interface FoundHit {
  id: string;
  index: string;
  previousStatus?: WorkflowStatus;
}

export interface IdIndexPair {
  id: string;
  index: string;
}

export interface IdIndexPairWithSource {
  id: string;
  index: string;
  source: Record<string, unknown>;
}

const resolveIndex = (index: string | string[]): string =>
  Array.isArray(index) ? index.join(',') : index;

const isWorkflowStatus = (v: unknown): v is WorkflowStatus =>
  typeof v === 'string' && (WORKFLOW_STATUS_VALUES as readonly string[]).includes(v);

export const extractWorkflowStatus = (source: unknown): WorkflowStatus | undefined => {
  if (typeof source !== 'object' || source === null) return undefined;
  const s = source as Record<string, unknown>;
  const modern = s[ALERT_WORKFLOW_STATUS];
  if (modern != null) {
    // A non-null modern field is authoritative; do not fall back to signal.status.
    // Returning undefined for an unrecognized value keeps the ID in emitted alertIds
    // while omitting it from previousStatuses (the update script still runs).
    if (isWorkflowStatus(modern)) return modern;
    return undefined;
  }
  // Legacy .siem-signals documents only have signal.status; use it as a fallback.
  const signal = s.signal;
  if (typeof signal === 'object' && signal !== null) {
    const legacy = (signal as Record<string, unknown>).status;
    if (isWorkflowStatus(legacy)) return legacy;
  }
  return undefined;
};

export const prefetchPreviousStatusesByIds = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[],
  // When the same _id can appear in multiple index families (e.g. detection alerts AND
  // attack-discovery alerts), pass hitsPerIdCap = 2 so the size calculation reserves
  // room for both hits. Capped IDs are reduced accordingly to stay within
  // index.max_result_window (MAX_ALERTS_PER_TRIGGER).
  hitsPerIdCap = 1
): Promise<{
  previousStatuses: PreviousStatus[];
  idToIndex: Map<string, string>;
  hits: FoundHit[];
}> => {
  // Use search (not mget) so ignore_unavailable: true tolerates missing indices
  // (e.g. the adhoc attack-discovery index may not exist yet).
  const maxIds = Math.floor(MAX_ALERTS_PER_TRIGGER / hitsPerIdCap);
  const cappedIds = ids.slice(0, maxIds);
  const searchResponse = await esClient.search({
    index: resolveIndex(index),
    query: { ids: { values: cappedIds } },
    _source_includes: [ALERT_WORKFLOW_STATUS, 'signal.status'],
    // cappedIds.length * hitsPerIdCap ≤ maxIds * hitsPerIdCap = MAX_ALERTS_PER_TRIGGER
    size: cappedIds.length * hitsPerIdCap,
    ignore_unavailable: true,
  });
  const previousStatuses: PreviousStatus[] = [];
  const idToIndex = new Map<string, string>();
  const hits: FoundHit[] = [];
  for (const hit of searchResponse.hits.hits) {
    if (hit._id != null) {
      const previousStatus = extractWorkflowStatus(hit._source);
      if (previousStatus !== undefined) {
        previousStatuses.push({ id: hit._id, previousStatus });
      }
      if (hit._index != null) {
        idToIndex.set(hit._id, hit._index);
        // Collect each (id, index) pair individually so callers can handle
        // cross-index _id collisions (ES only guarantees uniqueness within an index).
        hits.push({ id: hit._id, index: hit._index, previousStatus });
      }
    }
  }
  return { previousStatuses, idToIndex, hits };
};

export const fetchAlertIdToIndex = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[]
): Promise<IdIndexPair[]> => {
  const cappedIds = ids.slice(0, MAX_ALERTS_PER_TRIGGER);
  const searchResponse = await esClient.search({
    index: resolveIndex(index),
    query: { terms: { _id: cappedIds } },
    _source: false,
    // Use MAX_ALERTS_PER_TRIGGER (not cappedIds.length) so cross-index duplicates
    // (same _id in both detection-alert and Attack Discovery indices) are not
    // truncated when the chunk is smaller than the cap.
    size: MAX_ALERTS_PER_TRIGGER,
    ignore_unavailable: true,
  });
  const pairs: IdIndexPair[] = [];
  for (const hit of searchResponse.hits.hits) {
    if (hit._id != null && hit._index != null) {
      pairs.push({ id: hit._id, index: hit._index });
    }
  }
  return pairs;
};

export const prefetchPreviousStatusesByQuery = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  query: estypes.QueryDslQueryContainer,
  runtimeMappings?: estypes.MappingRuntimeFields,
  excludeStatus?: string
): Promise<{
  ids: string[];
  previousStatuses: PreviousStatus[];
  idToIndex: Map<string, string>;
  truncated: boolean;
}> => {
  const boolQuery: estypes.QueryDslBoolQuery = { filter: query };
  if (excludeStatus !== undefined) {
    // Exclude confirmed no-ops at ES level using the same precedence as extractWorkflowStatus:
    // 1. Modern field (kibana.alert.workflow_status) takes precedence — exclude if it equals target.
    // 2. Legacy-only docs (signal.status, no modern field) — exclude if signal.status equals target
    //    AND the modern field is absent, so we do not exclude docs where both fields are present
    //    but disagree (modern field wins and they are genuinely transitioning).
    // This ensures truncated only counts potentially-transitioning docs, preventing the
    // || truncated condition from firing for all-legacy-no-op requests over 10,000 documents.
    boolQuery.must_not = [
      { term: { [ALERT_WORKFLOW_STATUS]: excludeStatus } },
      {
        bool: {
          must: [{ term: { 'signal.status': excludeStatus } }],
          must_not: [{ exists: { field: ALERT_WORKFLOW_STATUS } }],
        },
      },
    ];
  }
  const searchResponse = await esClient.search({
    index: resolveIndex(index),
    query: { bool: boolQuery },
    _source_includes: [ALERT_WORKFLOW_STATUS, 'signal.status'],
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

export const verifyAlertIdsInIndex = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[]
): Promise<string[]> => {
  const pairs = await fetchAllAlertIdToIndex(esClient, index, ids);
  return Array.from(new Set(pairs.map((p) => p.id)));
};

export const fetchAllAlertIdToIndex = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[]
): Promise<IdIndexPair[]> => {
  const allPairs: IdIndexPair[] = [];
  for (let i = 0; i < ids.length; i += MAX_ALERTS_PER_TRIGGER) {
    const partial = await fetchAlertIdToIndex(
      esClient,
      index,
      ids.slice(i, i + MAX_ALERTS_PER_TRIGGER)
    );
    for (const pair of partial) {
      allPairs.push(pair);
    }
  }
  return allPairs;
};

export const fetchAlertIdIndexWithSource = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[],
  sourceFields: string[],
  hitsPerIdCap = 1
): Promise<IdIndexPairWithSource[]> => {
  const cappedIds = ids.slice(0, Math.floor(MAX_ALERTS_PER_TRIGGER / hitsPerIdCap));
  const searchResponse = await esClient.search({
    index: resolveIndex(index),
    query: { terms: { _id: cappedIds } },
    _source_includes: sourceFields,
    size: cappedIds.length * hitsPerIdCap,
    ignore_unavailable: true,
  });
  const pairs: IdIndexPairWithSource[] = [];
  for (const hit of searchResponse.hits.hits) {
    if (hit._id != null && hit._index != null) {
      pairs.push({
        id: hit._id,
        index: hit._index,
        source: (hit._source ?? {}) as Record<string, unknown>,
      });
    }
  }
  return pairs;
};

export const fetchAllAlertIdIndexWithSource = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[],
  sourceFields: string[],
  hitsPerIdCap = 1
): Promise<IdIndexPairWithSource[]> => {
  const chunkSize = Math.floor(MAX_ALERTS_PER_TRIGGER / hitsPerIdCap);
  const allPairs: IdIndexPairWithSource[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const partial = await fetchAlertIdIndexWithSource(
      esClient,
      index,
      ids.slice(i, i + chunkSize),
      sourceFields,
      hitsPerIdCap
    );
    for (const pair of partial) {
      allPairs.push(pair);
    }
  }
  return allPairs;
};

export const prefetchAllPreviousStatusesByIds = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[],
  hitsPerIdCap = 1
): Promise<{
  previousStatuses: PreviousStatus[];
  idToIndex: Map<string, string>;
  hits: FoundHit[];
}> => {
  const allPreviousStatuses: PreviousStatus[] = [];
  const allIdToIndex = new Map<string, string>();
  const allHits: FoundHit[] = [];
  const chunkSize = Math.floor(MAX_ALERTS_PER_TRIGGER / hitsPerIdCap);
  for (let i = 0; i < ids.length; i += chunkSize) {
    const { previousStatuses, idToIndex, hits } = await prefetchPreviousStatusesByIds(
      esClient,
      index,
      ids.slice(i, i + chunkSize),
      hitsPerIdCap
    );
    for (const ps of previousStatuses) {
      allPreviousStatuses.push(ps);
    }
    for (const [id, idx] of idToIndex) {
      allIdToIndex.set(id, idx);
    }
    for (const h of hits) {
      allHits.push(h);
    }
  }
  return { previousStatuses: allPreviousStatuses, idToIndex: allIdToIndex, hits: allHits };
};
