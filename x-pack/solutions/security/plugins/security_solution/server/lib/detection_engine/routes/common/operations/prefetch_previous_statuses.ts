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
import { isAttackDiscoveryIndex } from './is_attack_discovery_index';
import type { PreviousStatus } from '../../../../../events/types';
export type { PreviousStatus } from '../../../../../events/types';

export interface FoundHit {
  id: string;
  index: string;
  previousStatus?: WorkflowStatus;
  // True when a status field exists in the document (even if its value is unrecognised).
  // The update script only mutates documents whose status field is non-null, so hits with
  // hasStatusField=false will not transition and must not be emitted as workflow events.
  hasStatusField: boolean;
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

// The same _id can exist in every index a pattern resolves to — Elasticsearch only
// guarantees _id uniqueness within a single index — and `_update_by_query` mutates all
// of them. Reserve one hit per index family so the result window never drops a document
// the update touches. Callers must not hard-code this: `getUnifiedAlertsIndex()` returns
// three families (detection alerts + scheduled and adhoc attack discovery) while
// `getAttackAlertsIndex()` returns two, and those counts change independently.
const resolveHitsPerIdCap = (index: string | string[]): number =>
  Array.isArray(index) ? Math.max(index.length, 1) : 1;

const isWorkflowStatus = (v: unknown): v is WorkflowStatus =>
  typeof v === 'string' && (WORKFLOW_STATUS_VALUES as readonly string[]).includes(v);

// Returns true when the document contains any non-null status field. Mirrors the update
// script guards: modern field (kibana.alert.workflow_status != null) and legacy field
// (signal.status != null). If neither is true, the script will not mutate the document.
const hasAnyStatusField = (source: unknown): boolean => {
  if (typeof source !== 'object' || source === null) return false;
  const s = source as Record<string, unknown>;
  if (s[ALERT_WORKFLOW_STATUS] != null) return true;
  const signal = s.signal;
  return (
    typeof signal === 'object' &&
    signal !== null &&
    (signal as Record<string, unknown>).status != null
  );
};

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

/**
 * Builds a `FoundHit` from a raw search hit, returning undefined when the hit lacks the
 * `_id`/`_index` needed to place it in an index family.
 */
export const toFoundHit = (hit: {
  _id?: string;
  _index?: string;
  _source?: unknown;
}): FoundHit | undefined => {
  const { _id: id, _index: index, _source: source } = hit;
  if (id == null || index == null) return undefined;
  return {
    id,
    index,
    previousStatus: extractWorkflowStatus(source),
    hasStatusField: hasAnyStatusField(source),
  };
};

/**
 * True when the workflow-status update will actually transition this document: the update
 * script only mutates documents whose status field is non-null, and a document already at
 * the target status is a no-op. A hit with an unrecognized non-null status
 * (`previousStatus === undefined`) does transition and is included.
 */
export const isStatusTransition = (hit: FoundHit, targetStatus: WorkflowStatus): boolean =>
  hit.hasStatusField && hit.previousStatus !== targetStatus;

/**
 * Splits found hits into the IDs whose workflow status will actually transition and the
 * matching `previousStatuses` rows, deduplicating IDs that appear in more than one index
 * family. Building both lists in a single pass is what guarantees `previousStatuses`
 * never references an ID missing from the emitted ID list.
 */
export const collectStatusTransitions = (
  hits: readonly FoundHit[],
  targetStatus: WorkflowStatus
): { ids: string[]; previousStatuses: PreviousStatus[] } => {
  const ids: string[] = [];
  const previousStatuses: PreviousStatus[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    if (isStatusTransition(hit, targetStatus) && !seen.has(hit.id)) {
      seen.add(hit.id);
      ids.push(hit.id);
      if (hit.previousStatus !== undefined) {
        previousStatuses.push({ id: hit.id, previousStatus: hit.previousStatus });
      }
    }
  }
  return { ids, previousStatuses };
};

/**
 * Splits hits into detection-alert and attack-discovery ID lists, keeping only those the
 * caller reports as changing and deduplicating within each family. The prefetch deliberately
 * returns one hit per (id, index) to handle cross-index `_id` collisions, so the same ID can
 * legitimately appear once in each family — but never twice in the same one, which would make
 * a workflow process it repeatedly and let duplicates consume the emitted-ID cap.
 */
export const collectChangedIdsByFamily = (
  hits: readonly IdIndexPairWithSource[],
  hasChanged: (source: Record<string, unknown>) => boolean
): { alertIds: string[]; attackIds: string[] } => {
  const alertIds: string[] = [];
  const attackIds: string[] = [];
  const seenAlertIds = new Set<string>();
  const seenAttackIds = new Set<string>();
  for (const { id, index, source } of hits) {
    if (hasChanged(source)) {
      const isAttack = isAttackDiscoveryIndex(index);
      const seen = isAttack ? seenAttackIds : seenAlertIds;
      if (!seen.has(id)) {
        seen.add(id);
        (isAttack ? attackIds : alertIds).push(id);
      }
    }
  }
  return { alertIds, attackIds };
};

export const prefetchPreviousStatusesByIds = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[],
  // Defaults to one hit per index family the pattern resolves to; see resolveHitsPerIdCap.
  // Capped IDs are reduced accordingly to stay within index.max_result_window
  // (MAX_ALERTS_PER_TRIGGER).
  hitsPerIdCap?: number
): Promise<{
  previousStatuses: PreviousStatus[];
  idToIndex: Map<string, string>;
  hits: FoundHit[];
}> => {
  // Use search (not mget) so ignore_unavailable: true tolerates missing indices
  // (e.g. the adhoc attack-discovery index may not exist yet).
  const cap = hitsPerIdCap ?? resolveHitsPerIdCap(index);
  const maxIds = Math.floor(MAX_ALERTS_PER_TRIGGER / cap);
  const cappedIds = ids.slice(0, maxIds);
  const searchResponse = await esClient.search({
    index: resolveIndex(index),
    query: { ids: { values: cappedIds } },
    _source_includes: [ALERT_WORKFLOW_STATUS, 'signal.status'],
    // cappedIds.length * cap ≤ maxIds * cap ≤ MAX_ALERTS_PER_TRIGGER
    size: cappedIds.length * cap,
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
      // Collect each (id, index) pair individually so callers can handle
      // cross-index _id collisions (ES only guarantees uniqueness within an index).
      const found = toFoundHit(hit);
      if (found !== undefined) {
        idToIndex.set(found.id, found.index);
        hits.push(found);
      }
    }
  }
  return { previousStatuses, idToIndex, hits };
};

export const fetchAlertIdToIndex = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[],
  hitsPerIdCap?: number
): Promise<IdIndexPair[]> => {
  const cap = hitsPerIdCap ?? resolveHitsPerIdCap(index);
  const cappedIds = ids.slice(0, Math.floor(MAX_ALERTS_PER_TRIGGER / cap));
  const searchResponse = await esClient.search({
    index: resolveIndex(index),
    query: { terms: { _id: cappedIds } },
    _source: false,
    // Reserve one slot per index family so cross-index duplicates (same _id in the
    // detection-alert and Attack Discovery indices) never push another ID out of the
    // result window.
    size: cappedIds.length * cap,
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
  hits: FoundHit[];
  truncated: boolean;
}> => {
  const boolQuery: estypes.QueryDslBoolQuery = { filter: query };
  // Require at least one non-null status field. The update script only assigns when a status
  // field is non-null, so status-less documents never transition — and because `truncated` is
  // derived from `hits.total`, counting them would report truncation (and fire the trigger with
  // an empty ID list) for a large request that mutates nothing. `exists` is false for both a
  // missing field and an explicit null, matching the script's `!= null` guards. Applied
  // unconditionally: this helper exists to find documents that will actually change.
  boolQuery.must_not = [
    {
      bool: {
        must_not: [
          { exists: { field: ALERT_WORKFLOW_STATUS } },
          { exists: { field: 'signal.status' } },
        ],
      },
    },
  ];
  if (excludeStatus !== undefined) {
    // Exclude confirmed no-ops at ES level using the same precedence as extractWorkflowStatus:
    // 1. Modern field (kibana.alert.workflow_status) takes precedence — exclude if it equals target.
    // 2. Legacy-only docs (signal.status, no modern field) — exclude if signal.status equals target
    //    AND the modern field is absent, so we do not exclude docs where both fields are present
    //    but disagree (modern field wins and they are genuinely transitioning).
    // This ensures truncated only counts potentially-transitioning docs, preventing the
    // || truncated condition from firing for all-legacy-no-op requests over 10,000 documents.
    boolQuery.must_not.push(
      { term: { [ALERT_WORKFLOW_STATUS]: excludeStatus } },
      {
        bool: {
          must: [{ term: { 'signal.status': excludeStatus } }],
          must_not: [{ exists: { field: ALERT_WORKFLOW_STATUS } }],
        },
      }
    );
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
  const hits: FoundHit[] = [];
  for (const hit of searchResponse.hits.hits) {
    if (hit._id != null) {
      ids.push(hit._id);
      const previousStatus = extractWorkflowStatus(hit._source);
      if (previousStatus !== undefined) {
        previousStatuses.push({ id: hit._id, previousStatus });
      }
      // `hits` carries hasStatusField so callers can drop documents the update script
      // will not mutate; `ids` alone cannot distinguish those from real transitions.
      const found = toFoundHit(hit);
      if (found !== undefined) {
        idToIndex.set(found.id, found.index);
        hits.push(found);
      }
    }
  }
  return { ids, previousStatuses, idToIndex, hits, truncated };
};

export const verifyAlertIdsInIndex = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[]
): Promise<string[]> => {
  const pairs = await fetchAllAlertIdToIndex(esClient, index, ids);
  // Exclude Attack Discovery hits: the unified index contains both detection-alert
  // and attack-discovery families, but this helper is used specifically to verify
  // related detection-alert IDs. An AD hit whose _id collides with a stale detection
  // alert reference must not be emitted through alertTagsChanged/alertAssigneesChanged.
  return Array.from(
    new Set(pairs.filter((p) => !isAttackDiscoveryIndex(p.index)).map((p) => p.id))
  );
};

export const fetchAllAlertIdToIndex = async (
  esClient: ElasticsearchClient,
  index: string | string[],
  ids: string[]
): Promise<IdIndexPair[]> => {
  const cap = resolveHitsPerIdCap(index);
  const chunkSize = Math.floor(MAX_ALERTS_PER_TRIGGER / cap);
  const allPairs: IdIndexPair[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const partial = await fetchAlertIdToIndex(esClient, index, ids.slice(i, i + chunkSize), cap);
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
  hitsPerIdCap?: number
): Promise<IdIndexPairWithSource[]> => {
  const cap = hitsPerIdCap ?? resolveHitsPerIdCap(index);
  const cappedIds = ids.slice(0, Math.floor(MAX_ALERTS_PER_TRIGGER / cap));
  const searchResponse = await esClient.search({
    index: resolveIndex(index),
    query: { terms: { _id: cappedIds } },
    _source_includes: sourceFields,
    size: cappedIds.length * cap,
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
  hitsPerIdCap?: number
): Promise<IdIndexPairWithSource[]> => {
  const cap = hitsPerIdCap ?? resolveHitsPerIdCap(index);
  const chunkSize = Math.floor(MAX_ALERTS_PER_TRIGGER / cap);
  const allPairs: IdIndexPairWithSource[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const partial = await fetchAlertIdIndexWithSource(
      esClient,
      index,
      ids.slice(i, i + chunkSize),
      sourceFields,
      cap
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
  hitsPerIdCap?: number
): Promise<{
  previousStatuses: PreviousStatus[];
  idToIndex: Map<string, string>;
  hits: FoundHit[];
}> => {
  const allPreviousStatuses: PreviousStatus[] = [];
  const allIdToIndex = new Map<string, string>();
  const allHits: FoundHit[] = [];
  const cap = hitsPerIdCap ?? resolveHitsPerIdCap(index);
  const chunkSize = Math.floor(MAX_ALERTS_PER_TRIGGER / cap);
  for (let i = 0; i < ids.length; i += chunkSize) {
    const { previousStatuses, idToIndex, hits } = await prefetchPreviousStatusesByIds(
      esClient,
      index,
      ids.slice(i, i + chunkSize),
      cap
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
