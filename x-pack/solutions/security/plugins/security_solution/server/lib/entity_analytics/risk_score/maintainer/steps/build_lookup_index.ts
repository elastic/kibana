/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { BulkOperationContainer, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { MAX_ENTITY_SEARCH_PAGE_SIZE } from '../../constants';
import type { ScopedLogger } from '../utils/with_log_context';
import {
  RESOLUTION_RELATIONSHIP_TYPE,
  SELF_RELATIONSHIP_TYPE,
  type EntityStoreLookupSource,
  type LookupDocument,
} from '../lookup/lookup_types';

export interface BuildLookupIndexParams {
  esClient: ElasticsearchClient;
  crudClient: EntityUpdateClient;
  logger: ScopedLogger;
  lookupIndex: string;
  entityTypes: EntityType[];
  calculationRunId: string;
  now: string;
  abortSignal?: AbortSignal;
}

export interface BuildLookupIndexResult {
  lookupRowsWritten: number;
  entitiesIterated: number;
  pagesProcessed: number;
  bulkBatches: number;
  lookupRowsFailed: number;
}

const LOOKUP_BUILD_PAGE_SIZE = MAX_ENTITY_SEARCH_PAGE_SIZE;
const FAILURE_REASONS_CAP = 5;
const UNKNOWN_BULK_ERROR_REASON = 'unknown_bulk_error';

interface BulkSummary {
  successfulItems: number;
  failedItems: number;
  reasonsByCount: Map<string, number>;
}

/**
 * One row per iterated entity, keyed by its own EUID:
 * - alias (has resolved_to): alias row pointing at the target.
 * - plain: self-row.
 *
 * Resolution targets that are not themselves in the entity store have no row;
 * Phase 2 ES|QL recovers their `resolution_target_id` via
 * `COALESCE(resolution_target_id, entity_id)` after the LOOKUP JOIN.
 */
const buildLookupRowsForEntity = (
  source: EntityStoreLookupSource,
  { calculationRunId, now }: { calculationRunId: string; now: string }
): LookupDocument[] => {
  const entityId = source.entity?.id;
  if (!entityId) {
    return [];
  }

  const resolvedTo = source.entity?.relationships?.resolution?.resolved_to;
  if (resolvedTo) {
    return [
      {
        entity_id: entityId,
        resolution_target_id: resolvedTo,
        propagation_target_id: null,
        relationship_type: RESOLUTION_RELATIONSHIP_TYPE,
        calculation_run_id: calculationRunId,
        '@timestamp': now,
      },
    ];
  }

  return [
    {
      entity_id: entityId,
      resolution_target_id: entityId,
      propagation_target_id: null,
      relationship_type: SELF_RELATIONSHIP_TYPE,
      calculation_run_id: calculationRunId,
      '@timestamp': now,
    },
  ];
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
}: {
  crudClient: EntityUpdateClient;
  entityTypes: EntityType[];
  searchAfter: Array<string | number> | undefined;
}) =>
  crudClient.listEntities({
    filter: { terms: { 'entity.EngineMetadata.Type': entityTypes } },
    size: LOOKUP_BUILD_PAGE_SIZE,
    searchAfter,
    source: ['entity.id', 'entity.relationships.resolution.resolved_to'],
  });

export const buildLookupIndex = async ({
  esClient,
  crudClient,
  logger,
  lookupIndex,
  entityTypes,
  calculationRunId,
  now,
  abortSignal,
}: BuildLookupIndexParams): Promise<BuildLookupIndexResult> => {
  if (entityTypes.length === 0) {
    logger.debug('Lookup build skipped because no entity types are configured');
    return {
      lookupRowsWritten: 0,
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
  let searchAfter: Array<string | number> | undefined;
  let previousSearchAfter: Array<string | number> | undefined;
  const failureReasons = new Map<string, number>();

  do {
    if (abortSignal?.aborted) {
      logger.info('Lookup build aborted between pages');
      return {
        lookupRowsWritten,
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

    const docs = entities.flatMap((entity: EntityStoreLookupSource) =>
      buildLookupRowsForEntity(entity, { calculationRunId, now })
    );
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
    entitiesIterated,
    pagesProcessed,
    bulkBatches,
    lookupRowsFailed,
  };
};
