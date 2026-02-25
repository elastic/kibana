/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALL_ENTITY_TYPES } from '@kbn/entity-store';
import type { EntityType } from '@kbn/entity-store';
import type { MonitoringEntitySource } from '../../../../../../../common/api/entity_analytics';
import type { WatchlistBulkEntity } from '../../types';
import { buildEntitiesSearchBody } from './queries';
import { applyBulkUpsert } from '../../bulk/upsert';
import type { AfterKey, EntitiesAggregation } from './types';

export type UpdateDetectionService = ReturnType<typeof createUpdateDetectionService>;

const getExistingEntitiesMap = async (
  esClient: ElasticsearchClient,
  targetIndex: string,
  euids: string[]
): Promise<Map<string, string>> => {
  if (euids.length === 0) {
    return new Map();
  }

  const uniqueEuids = uniq(euids);
  const response = await esClient.search<{ entity?: { id?: string } }>({
    index: targetIndex,
    size: uniqueEuids.length,
    query: { terms: { 'entity.id': uniqueEuids } },
    _source: ['entity.id'],
  });

  const map = new Map<string, string>();
  for (const hit of response.hits.hits) {
    const euid = hit._source?.entity?.id;
    if (euid && hit._id) {
      map.set(euid, hit._id);
    }
  }
  return map;
};

export const createUpdateDetectionService = ({
  esClient,
  logger,
  targetIndex,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  targetIndex: string;
}) => {
  const updateDetectionForEntityType = async (
    source: MonitoringEntitySource,
    entityType: EntityType
  ): Promise<WatchlistBulkEntity[]> => {
    const pageSize = 100;
    let afterKey: AfterKey;
    let fetchMore = true;
    const allEntities: WatchlistBulkEntity[] = [];

    while (fetchMore) {
      const response = await esClient.search<never, EntitiesAggregation>({
        index: source.indexPattern,
        ...buildEntitiesSearchBody(entityType, afterKey, pageSize),
      });

      const agg = response.aggregations?.entities;
      const buckets = agg?.buckets ?? [];

      if (buckets.length > 0) {
        const batchEuids = buckets.map((b) => b.key.euid);
        const existingMap = await getExistingEntitiesMap(esClient, targetIndex, batchEuids);

        const entities: WatchlistBulkEntity[] = buckets.map((bucket) => ({
          euid: bucket.key.euid,
          type: entityType,
          sourceId: source.id,
          existingEntityId: existingMap.get(bucket.key.euid),
        }));
        allEntities.push(...entities);
      }

      afterKey = agg?.after_key;
      fetchMore = Boolean(afterKey);
    }

    return allEntities;
  };

  const updateDetection = async (source: MonitoringEntitySource) => {
    const allEntities: WatchlistBulkEntity[] = [];

    for (const entityType of ALL_ENTITY_TYPES) {
      const entities = await updateDetectionForEntityType(source, entityType);
      allEntities.push(...entities);
    }

    await applyBulkUpsert({
      esClient,
      logger,
      entities: allEntities,
      source,
      targetIndex,
    });

    logger.info(
      `[WatchlistSync] Update detection: found ${allEntities.length} entities from source ${source.id}`
    );
    return allEntities;
  };

  return { updateDetection };
};
