/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { BulkOperationContainer, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { MAX_ENTITY_SEARCH_PAGE_SIZE } from '../../constants';
import type { ScopedLogger } from '../utils/with_log_context';
import {
  RESOLUTION_RELATIONSHIP_TYPE,
  SELF_RELATIONSHIP_TYPE,
  type EntityStoreLookupSource,
  type LookupDocument,
} from '../lookup/lookup_types';
import {
  getRelationshipFieldsForTarget,
  getPropagationRulesForTarget,
  getSourceIdsForRule,
} from '../propagation/propagation_rules';

export interface BuildLookupIndexParams {
  esClient: ElasticsearchClient;
  crudClient: EntityUpdateClient;
  logger: ScopedLogger;
  lookupIndex: string;
  entityTypes: EntityType[];
  calculationRunId: string;
  now: string;
  propagationEnabled: boolean;
  abortSignal?: AbortSignal;
}

export interface BuildLookupIndexResult {
  lookupRowsWritten: number;
  propagationRowsWritten: number;
  entitiesIterated: number;
  pagesProcessed: number;
  bulkBatches: number;
  lookupRowsFailed: number;
}

const LOOKUP_BUILD_PAGE_SIZE = MAX_ENTITY_SEARCH_PAGE_SIZE;
const FAILURE_REASONS_CAP = 5;
const UNKNOWN_BULK_ERROR_REASON = 'unknown_bulk_error';
const BASE_LOOKUP_SOURCE_FIELDS = ['entity.id', 'entity.type', 'entity.EngineMetadata.Type'] as const;
const RESOLUTION_RELATIONSHIP_SOURCE_FIELD = 'entity.relationships.resolution.resolved_to';
const ENTITY_TYPE_SET = new Set<EntityType>(Object.values(EntityType));

interface BulkSummary {
  successfulItems: number;
  failedItems: number;
  reasonsByCount: Map<string, number>;
}

const isEntityType = (value: EntityType | undefined): value is EntityType =>
  value !== undefined && ENTITY_TYPE_SET.has(value);

/**
 * One row per iterated entity, keyed by its own EUID:
 * - alias (has resolved_to): alias row pointing at the target.
 * - plain: self-row.
 *
 * Resolution targets that are not themselves in the entity store have no row;
 * Phase 2 ES|QL recovers their `resolution_target_id` via
 * `COALESCE(resolution_target_id, entity_id)` after the LOOKUP JOIN.
 */
const createSelfLookupRow = ({
  entityId,
  calculationRunId,
  now,
}: {
  entityId: string;
  calculationRunId: string;
  now: string;
}): LookupDocument => ({
  entity_id: entityId,
  resolution_target_id: entityId,
  propagation_target_id: null,
  relationship_type: SELF_RELATIONSHIP_TYPE,
  calculation_run_id: calculationRunId,
  '@timestamp': now,
});

const uniquePropagationTargets = (
  values: Array<string[] | null | undefined>
): string[] | null => {
  const merged = new Set<string>();
  for (const value of values) {
    if (!Array.isArray(value)) {
      continue;
    }
    for (const targetId of value) {
      if (typeof targetId === 'string' && targetId.length > 0) {
        merged.add(targetId);
      }
    }
  }
  return merged.size > 0 ? [...merged] : null;
};

const mergeLookupRows = (existing: LookupDocument, incoming: LookupDocument): LookupDocument => {
  const shouldKeepExistingRelationship =
    existing.relationship_type !== SELF_RELATIONSHIP_TYPE &&
    incoming.relationship_type === SELF_RELATIONSHIP_TYPE;
  const relationshipSource = shouldKeepExistingRelationship ? existing : incoming;

  return {
    ...incoming,
    resolution_target_id: relationshipSource.resolution_target_id,
    relationship_type: relationshipSource.relationship_type,
    propagation_target_id: uniquePropagationTargets([
      existing.propagation_target_id,
      incoming.propagation_target_id,
    ]),
  };
};

const upsertLookupRow = ({
  rowsByEntityId,
  row,
}: {
  rowsByEntityId: Map<string, LookupDocument>;
  row: LookupDocument;
}) => {
  const existing = rowsByEntityId.get(row.entity_id);
  if (!existing) {
    rowsByEntityId.set(row.entity_id, row);
    return;
  }

  rowsByEntityId.set(row.entity_id, mergeLookupRows(existing, row));
};

const buildLookupRowsForEntity = ({
  source,
  rowsByEntityId,
  propagationRowsTouched,
  propagationEnabled,
  calculationRunId,
  now,
}: {
  source: EntityStoreLookupSource;
  rowsByEntityId: Map<string, LookupDocument>;
  propagationRowsTouched: Set<string>;
  propagationEnabled: boolean;
  calculationRunId: string;
  now: string;
}): void => {
  const entityId = source.entity?.id;
  if (!entityId) {
    return;
  }

  const resolvedTo = source.entity?.relationships?.resolution?.resolved_to;
  if (resolvedTo) {
    upsertLookupRow({
      rowsByEntityId,
      row: {
        entity_id: entityId,
        resolution_target_id: resolvedTo,
        propagation_target_id: null,
        relationship_type: RESOLUTION_RELATIONSHIP_TYPE,
        calculation_run_id: calculationRunId,
        '@timestamp': now,
      },
    });
  } else {
    upsertLookupRow({
      rowsByEntityId,
      row: createSelfLookupRow({ entityId, calculationRunId, now }),
    });
  }

  if (!propagationEnabled) {
    return;
  }

  const targetEntityType =
    source.entity?.EngineMetadata?.Type ??
    source.entity?.type;

  if (!isEntityType(targetEntityType)) {
    return;
  }

  for (const rule of getPropagationRulesForTarget(targetEntityType)) {
    const sourceIds = [...new Set(getSourceIdsForRule(source, rule))];
    for (const sourceId of sourceIds) {
      if (!sourceId) {
        continue;
      }

      const existingRow = rowsByEntityId.get(sourceId);
      const sourceRow = existingRow
        ? {
            ...existingRow,
          }
        : createSelfLookupRow({
            entityId: sourceId,
            calculationRunId,
            now,
          });

      sourceRow.propagation_target_id = uniquePropagationTargets([
        sourceRow.propagation_target_id,
        [entityId],
      ]);

      upsertLookupRow({ rowsByEntityId, row: sourceRow });
      propagationRowsTouched.add(sourceId);
    }
  }
};

/** Emits ES bulk action/document pairs keyed by `entity_id`. */
const toBulkIndexOperations = (
  docs: LookupDocument[],
  index: string
): Array<BulkOperationContainer | LookupDocument> => {
  const operations: Array<BulkOperationContainer | LookupDocument> = [];
  for (const doc of docs) {
    operations.push({ index: { _index: index, _id: doc.entity_id } });
    operations.push(doc);
  }
  return operations;
};

const incrementReason = (
  reasonsByCount: Map<string, number>,
  reason: string,
  amount: number
): void => {
  const existing = reasonsByCount.get(reason);
  if (existing !== undefined) {
    reasonsByCount.set(reason, existing + amount);
    return;
  }
  if (reasonsByCount.size < FAILURE_REASONS_CAP) {
    reasonsByCount.set(reason, amount);
  }
};

/**
 * Folds a bulk response into counts + bounded reason map. Three shapes:
 * per-item details → inspect each; no items + no errors → all success;
 * no items + errors → all failed as `UNKNOWN_BULK_ERROR_REASON`.
 */
const summarizeBulkResponse = (response: BulkResponse, expectedItemCount: number): BulkSummary => {
  const reasonsByCount = new Map<string, number>();
  const items = response.items ?? [];

  if (items.length === 0) {
    if (response.errors) {
      incrementReason(reasonsByCount, UNKNOWN_BULK_ERROR_REASON, expectedItemCount);
      return { successfulItems: 0, failedItems: expectedItemCount, reasonsByCount };
    }
    return { successfulItems: expectedItemCount, failedItems: 0, reasonsByCount };
  }

  let successfulItems = 0;
  let failedItems = 0;
  for (const item of items) {
    if (item.index?.error) {
      failedItems += 1;
      incrementReason(reasonsByCount, item.index.error.reason ?? UNKNOWN_BULK_ERROR_REASON, 1);
    } else if (item.index) {
      successfulItems += 1;
    }
  }
  return { successfulItems, failedItems, reasonsByCount };
};

const mergeFailureReasons = (target: Map<string, number>, source: Map<string, number>): void => {
  for (const [reason, count] of source) {
    incrementReason(target, reason, count);
  }
};

const fetchNextEntityStorePage = async ({
  crudClient,
  entityTypes,
  searchAfter,
  propagationEnabled,
}: {
  crudClient: EntityUpdateClient;
  entityTypes: EntityType[];
  searchAfter: Array<string | number> | undefined;
  propagationEnabled: boolean;
}): Promise<{
  entities: EntityStoreLookupSource[];
  nextSearchAfter: Array<string | number> | undefined;
}> => {
  // Phase 0 always needs id + resolution link. Propagation additionally needs
  // rule-specific relationship leaf fields from target entities.
  const response = await crudClient.listEntities({
    filter: { terms: { 'entity.EngineMetadata.Type': entityTypes } },
    size: LOOKUP_BUILD_PAGE_SIZE,
    searchAfter,
    source: [
      ...BASE_LOOKUP_SOURCE_FIELDS,
      RESOLUTION_RELATIONSHIP_SOURCE_FIELD,
      ...(propagationEnabled
        ? [
            ...new Set(
              entityTypes.flatMap((entityType) => getRelationshipFieldsForTarget(entityType))
            ),
          ]
        : []),
    ],
  });

  return {
    entities: response.entities as EntityStoreLookupSource[],
    nextSearchAfter: response.nextSearchAfter,
  };
};

const mergeWithCurrentRunRows = async ({
  esClient,
  lookupIndex,
  rows,
  calculationRunId,
  propagationEnabled,
}: {
  esClient: ElasticsearchClient;
  lookupIndex: string;
  rows: LookupDocument[];
  calculationRunId: string;
  propagationEnabled: boolean;
}): Promise<LookupDocument[]> => {
  if (rows.length === 0) {
    return [];
  }

  const entityIds = rows.map((row) => row.entity_id);
  const existingResponse = await esClient.search<LookupDocument>({
    index: lookupIndex,
    size: entityIds.length,
    track_total_hits: false,
    _source: [
      'entity_id',
      'resolution_target_id',
      'propagation_target_id',
      'relationship_type',
      'calculation_run_id',
      '@timestamp',
    ],
    query: {
      terms: {
        entity_id: entityIds,
      },
    },
  });
  const existingRowsById = new Map<string, LookupDocument>();
  for (const hit of existingResponse.hits.hits) {
    const source = hit._source;
    if (!source?.entity_id || source.calculation_run_id !== calculationRunId) {
      continue;
    }
    existingRowsById.set(source.entity_id, source);
  }

  return rows.map((row) => {
    const existing = existingRowsById.get(row.entity_id);
    if (!existing) {
      return row;
    }

    const merged = mergeLookupRows(existing, row);
    return {
      ...merged,
      propagation_target_id: propagationEnabled ? merged.propagation_target_id : null,
    };
  });
};

export const buildLookupIndex = async ({
  esClient,
  crudClient,
  logger,
  lookupIndex,
  entityTypes,
  calculationRunId,
  now,
  propagationEnabled,
  abortSignal,
}: BuildLookupIndexParams): Promise<BuildLookupIndexResult> => {
  if (entityTypes.length === 0) {
    logger.debug('Lookup build skipped because no entity types are configured');
    return {
      lookupRowsWritten: 0,
      propagationRowsWritten: 0,
      entitiesIterated: 0,
      pagesProcessed: 0,
      bulkBatches: 0,
      lookupRowsFailed: 0,
    };
  }

  let lookupRowsWritten = 0;
  let entitiesIterated = 0;
  let pagesProcessed = 0;
  let bulkBatches = 0;
  let lookupRowsFailed = 0;
  const propagationRowsTouched = new Set<string>();
  let searchAfter: Array<string | number> | undefined;
  let previousSearchAfter: Array<string | number> | undefined;
  const failureReasons = new Map<string, number>();

  do {
    if (abortSignal?.aborted) {
      logger.info('Lookup build aborted between pages');
      return {
        lookupRowsWritten,
        propagationRowsWritten: propagationRowsTouched.size,
        entitiesIterated,
        pagesProcessed,
        bulkBatches,
        lookupRowsFailed,
      };
    }

    const { entities, nextSearchAfter } = await fetchNextEntityStorePage({
      crudClient,
      entityTypes,
      searchAfter,
      propagationEnabled,
    });
    entitiesIterated += entities.length;
    searchAfter = nextSearchAfter;
    if (
      searchAfter !== undefined &&
      previousSearchAfter !== undefined &&
      JSON.stringify(searchAfter) === JSON.stringify(previousSearchAfter)
    ) {
      logger.error(
        'listEntities returned the same searchAfter cursor twice; aborting pagination to prevent infinite loop'
      );
      break;
    }
    previousSearchAfter = searchAfter;
    pagesProcessed += 1;

    const rowsByEntityId = new Map<string, LookupDocument>();
    const pagePropagationRowsTouched = new Set<string>();

    for (const entity of entities) {
      buildLookupRowsForEntity({
        source: entity,
        rowsByEntityId,
        propagationRowsTouched: pagePropagationRowsTouched,
        propagationEnabled,
        calculationRunId,
        now,
      });
    }

    for (const touchedEntityId of pagePropagationRowsTouched) {
      propagationRowsTouched.add(touchedEntityId);
    }

    const docs = await mergeWithCurrentRunRows({
      esClient,
      lookupIndex,
      rows: [...rowsByEntityId.values()],
      calculationRunId,
      propagationEnabled,
    });
    const operations = toBulkIndexOperations(docs, lookupIndex);
    if (operations.length > 0) {
      bulkBatches += 1;
      const response = await esClient.bulk({ operations });
      const summary = summarizeBulkResponse(response, operations.length / 2);
      lookupRowsWritten += summary.successfulItems;
      lookupRowsFailed += summary.failedItems;
      mergeFailureReasons(failureReasons, summary.reasonsByCount);
    }
  } while (searchAfter !== undefined);

  if (lookupRowsFailed > 0) {
    const reasonsSummary = [...failureReasons.entries()]
      .map(([reason, count]) => `${count}x ${reason}`)
      .join('; ');
    throw new Error(
      `Phase 0 lookup build had ${lookupRowsFailed} failed item(s) across ${entitiesIterated} iterated entities; reasons: ${reasonsSummary}`
    );
  }

  await esClient.indices.refresh({ index: lookupIndex });

  return {
    lookupRowsWritten,
    propagationRowsWritten: propagationRowsTouched.size,
    entitiesIterated,
    pagesProcessed,
    bulkBatches,
    lookupRowsFailed,
  };
};
