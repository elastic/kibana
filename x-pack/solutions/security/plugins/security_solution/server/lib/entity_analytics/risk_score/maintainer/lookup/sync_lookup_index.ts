/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { LookupDocument } from './lookup_types';
import type { CategorizedEntities, ScoredEntityPage } from '../steps/pipeline_types';

interface SyncLookupIndexParams {
  esClient: ElasticsearchClient;
  index: string;
  upserts: LookupDocument[];
  deletes: string[];
}

export interface LookupSyncSummary {
  upserted: number;
  deleted: number;
}

const RESOLUTION_RELATIONSHIP_TYPE = 'entity.relationships.resolution.resolved_to';
const SELF_RELATIONSHIP_TYPE = 'self';

export const buildLookupSyncOperationsForPage = ({
  page,
  now,
  notInStoreEntityIds,
  resolutionTargetIds = [],
}: {
  page: ScoredEntityPage;
  now: string;
  notInStoreEntityIds: string[];
  resolutionTargetIds?: string[];
}): { upserts: LookupDocument[]; deletes: string[] } => {
  const upsertMap = new Map<string, LookupDocument>();

  for (const [entityId, entity] of page.entities.entries()) {
    const targetId = entity.entity?.relationships?.resolution?.resolved_to;
    if (targetId) {
      upsertMap.set(entityId, {
        entity_id: entityId,
        resolution_target_id: targetId,
        propagation_target_id: null,
        relationship_type: RESOLUTION_RELATIONSHIP_TYPE,
        '@timestamp': now,
      });

      if (!upsertMap.has(targetId)) {
        upsertMap.set(targetId, {
          entity_id: targetId,
          resolution_target_id: targetId,
          propagation_target_id: null,
          relationship_type: SELF_RELATIONSHIP_TYPE,
          '@timestamp': now,
        });
      }
    }
  }

  for (const targetId of resolutionTargetIds) {
    // Some pages only confirm that a target exists; they may not contain an
    // alias row that would otherwise create the target's self mapping.
    if (!upsertMap.has(targetId)) {
      upsertMap.set(targetId, {
        entity_id: targetId,
        resolution_target_id: targetId,
        propagation_target_id: null,
        relationship_type: SELF_RELATIONSHIP_TYPE,
        '@timestamp': now,
      });
    }
  }

  const upserts = [...upsertMap.values()];
  return { upserts, deletes: notInStoreEntityIds };
};

export const syncLookupIndex = async ({
  esClient,
  index,
  upserts,
  deletes,
}: SyncLookupIndexParams): Promise<LookupSyncSummary> => {
  if (upserts.length === 0 && deletes.length === 0) {
    return { upserted: 0, deleted: 0 };
  }

  const operations: Array<Record<string, unknown>> = [];

  for (const doc of upserts) {
    operations.push({ index: { _index: index, _id: doc.entity_id } });
    operations.push({ ...doc });
  }

  for (const entityId of deletes) {
    operations.push({ delete: { _index: index, _id: entityId } });
  }

  const response = await esClient.bulk({ operations });

  if (response.errors) {
    const failureReasons = (response.items ?? [])
      .map((item) => item.index?.error?.reason ?? item.delete?.error?.reason)
      .filter((reason): reason is string => Boolean(reason));

    if (failureReasons.length > 0) {
      throw new Error(`lookup sync bulk failed: ${failureReasons.join('; ')}`);
    }

    throw new Error('lookup sync bulk failed');
  }

  return { upserted: upserts.length, deleted: deletes.length };
};

export const syncLookupIndexForCategorizedPage = async ({
  esClient,
  index,
  page,
  categorized,
  now,
  resolutionTargetIds = [],
}: {
  esClient: ElasticsearchClient;
  index: string;
  page: ScoredEntityPage;
  categorized: CategorizedEntities;
  now: string;
  resolutionTargetIds?: string[];
}): Promise<LookupSyncSummary> =>
  syncLookupIndex({
    esClient,
    index,
    ...buildLookupSyncOperationsForPage({
      page,
      now,
      notInStoreEntityIds: categorized.not_in_store.map((score) => score.id_value),
      resolutionTargetIds,
    }),
  });
