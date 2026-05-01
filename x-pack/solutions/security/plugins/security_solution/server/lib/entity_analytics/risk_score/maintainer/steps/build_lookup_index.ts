/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EntityUpdateClient } from '@kbn/entity-store/server';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { MAX_ENTITY_SEARCH_PAGE_SIZE } from '../../constants';
import type { ScopedLogger } from '../utils/with_log_context';
import {
  RESOLUTION_RELATIONSHIP_TYPE,
  SELF_RELATIONSHIP_TYPE,
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

const buildLookupOperationsForPage = ({
  entities,
  now,
  calculationRunId,
  lookupIndex,
}: {
  entities: Array<{
    entity?: {
      id?: string;
      relationships?: { resolution?: { resolved_to?: string } };
    };
  }>;
  now: string;
  calculationRunId: string;
  lookupIndex: string;
}): Array<Record<string, unknown>> => {
  const pageLookupMap = new Map<string, LookupDocument>();

  for (const storeEntity of entities) {
    const entityId = storeEntity.entity?.id;
    if (entityId) {
      const resolvedTo = storeEntity.entity?.relationships?.resolution?.resolved_to;

      if (resolvedTo) {
        pageLookupMap.set(entityId, {
          entity_id: entityId,
          resolution_target_id: resolvedTo,
          propagation_target_id: null,
          relationship_type: RESOLUTION_RELATIONSHIP_TYPE,
          calculation_run_id: calculationRunId,
          '@timestamp': now,
        });

        if (!pageLookupMap.has(resolvedTo)) {
          pageLookupMap.set(resolvedTo, {
            entity_id: resolvedTo,
            resolution_target_id: resolvedTo,
            propagation_target_id: null,
            relationship_type: SELF_RELATIONSHIP_TYPE,
            calculation_run_id: calculationRunId,
            '@timestamp': now,
          });
        }
      } else if (!pageLookupMap.has(entityId)) {
        pageLookupMap.set(entityId, {
          entity_id: entityId,
          resolution_target_id: entityId,
          propagation_target_id: null,
          relationship_type: SELF_RELATIONSHIP_TYPE,
          calculation_run_id: calculationRunId,
          '@timestamp': now,
        });
      }
    }
  }

  const operations: Array<Record<string, unknown>> = [];
  for (const doc of pageLookupMap.values()) {
    operations.push({ index: { _index: lookupIndex, _id: doc.entity_id } });
    operations.push(doc as unknown as Record<string, unknown>);
  }

  return operations;
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
  const failureReasonsTopN = new Map<string, number>();

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

    const operations = buildLookupOperationsForPage({
      entities,
      now,
      calculationRunId,
      lookupIndex,
    });

    if (operations.length > 0) {
      bulkBatches += 1;
      const response = await esClient.bulk({ operations });
      const items = response.items ?? [];
      let successfulItems = 0;

      for (const item of items) {
        if (item.index?.error) {
          lookupRowsFailed += 1;
          const reason = item.index.error.reason ?? 'unknown_bulk_error';
          if (failureReasonsTopN.has(reason)) {
            failureReasonsTopN.set(reason, (failureReasonsTopN.get(reason) ?? 0) + 1);
          } else if (failureReasonsTopN.size < 5) {
            failureReasonsTopN.set(reason, 1);
          }
        } else if (item.index) {
          successfulItems += 1;
        }
      }

      if (!response.errors && items.length === 0) {
        successfulItems = operations.length / 2;
      }

      if (response.errors && items.length === 0) {
        lookupRowsFailed += operations.length / 2;
        if (!failureReasonsTopN.has('unknown_bulk_error') && failureReasonsTopN.size < 5) {
          failureReasonsTopN.set('unknown_bulk_error', operations.length / 2);
        } else if (failureReasonsTopN.has('unknown_bulk_error')) {
          failureReasonsTopN.set(
            'unknown_bulk_error',
            (failureReasonsTopN.get('unknown_bulk_error') ?? 0) + operations.length / 2
          );
        }
      }

      lookupRowsWritten += successfulItems;
    }
  } while (searchAfter !== undefined);

  if (lookupRowsFailed > 0) {
    const reasonsSummary = [...failureReasonsTopN.entries()]
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
