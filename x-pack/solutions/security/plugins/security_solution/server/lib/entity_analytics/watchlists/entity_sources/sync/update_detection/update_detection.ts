/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { ALL_ENTITY_TYPES } from '@kbn/entity-store/common';
import type { EntityType } from '@kbn/entity-store/common';
import type { MonitoringEntitySource } from '../../../../../../../common/api/entity_analytics';
import type { EntityStoreEntityIdsByType } from '../../../entities/service';
import type { WatchlistBulkEntity } from '../../types';
import { createWatchlistSyncMarkersService } from '../sync_markers';
import type { MonitoringEntitySourceDescriptorClient } from '../../../../privilege_monitoring/saved_objects';
import { isTimestampGreaterThan } from '../../../../privilege_monitoring/data_sources/sync/utils';
import { buildEntitiesSearchBody } from './queries';
import { applyBulkUpsert } from '../../bulk/upsert';
import { getEntityNameFromDoc } from './entity_utils';
import type { AfterKey, EntityBucket, EntitiesAggregation } from './types';

export type UpdateDetectionService = ReturnType<typeof createUpdateDetectionService>;

type UpdateDetection = (
  source: MonitoringEntitySource,
  entityStoreEntityIdsByType: EntityStoreEntityIdsByType
) => Promise<WatchlistBulkEntity[]>;

const pickLaterTimestamp = (
  current: string | undefined,
  candidate: string | undefined
): string | undefined => {
  if (!candidate) return current;
  if (!current || isTimestampGreaterThan(candidate, current)) return candidate;
  return current;
};

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

interface UpdateDetectionForEntityTypeResult {
  entities: WatchlistBulkEntity[];
  maxTimestamp?: string;
}

const bucketToEntity = (
  bucket: EntityBucket,
  entityType: EntityType,
  sourceId: string,
  existingMap: Map<string, string>,
  useSyncMarker: boolean
): WatchlistBulkEntity => {
  const entity: WatchlistBulkEntity = {
    euid: bucket.key.euid,
    type: entityType,
    sourceId,
    existingEntityId: existingMap.get(bucket.key.euid),
  };
  if (useSyncMarker && bucket.latest_doc?.hits?.hits?.[0]) {
    const topHit = bucket.latest_doc.hits.hits[0];
    entity.name = getEntityNameFromDoc(
      entityType,
      (topHit._source ?? {}) as Parameters<typeof getEntityNameFromDoc>[1]
    );
  }
  return entity;
};

const extractMaxTimestampFromBuckets = (buckets: EntityBucket[]): string | undefined => {
  let max: string | undefined;
  for (const bucket of buckets) {
    const ts = bucket.latest_doc?.hits?.hits?.[0]?._source?.['@timestamp'];
    if (typeof ts === 'string') {
      max = max ? (isTimestampGreaterThan(ts, max) ? ts : max) : ts;
    }
  }
  return max;
};

const getAllowedEntityIds = (
  entityStoreEntityIdsByType: EntityStoreEntityIdsByType,
  entityType: EntityType
): string[] => entityStoreEntityIdsByType[entityType] ?? [];

export const createUpdateDetectionService = ({
  esClient,
  logger,
  targetIndex,
  descriptorClient,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  targetIndex: string;
  descriptorClient?: MonitoringEntitySourceDescriptorClient;
}) => {
  const syncMarkersService = descriptorClient
    ? createWatchlistSyncMarkersService(descriptorClient)
    : undefined;

  const updateDetectionForEntityType = async (
    source: MonitoringEntitySource,
    entityType: EntityType,
    allowedEntityIds: string[],
    syncMarker?: string
  ): Promise<UpdateDetectionForEntityTypeResult> => {
    if (allowedEntityIds.length === 0) {
      return { entities: [] };
    }

    const pageSize = 100;
    let afterKey: AfterKey;
    let fetchMore = true;
    const allEntities: WatchlistBulkEntity[] = [];
    let maxTimestamp: string | undefined;

    while (fetchMore) {
      const query = buildEntitiesSearchBody(
        entityType,
        afterKey,
        pageSize,
        syncMarker,
        allowedEntityIds
      );
      const response = await esClient.search<never, EntitiesAggregation>({
        index: source.indexPattern,
        ...query,
      });

      const agg = response.aggregations?.entities;
      const buckets = agg?.buckets ?? [];

      if (buckets.length > 0) {
        const batchEuids = buckets.map((b) => b.key.euid);
        const existingMap = await getExistingEntitiesMap(esClient, targetIndex, batchEuids);

        const entities: WatchlistBulkEntity[] = buckets.map((bucket) =>
          bucketToEntity(bucket, entityType, source.id, existingMap, Boolean(syncMarker))
        );
        allEntities.push(...entities);

        if (syncMarker) {
          const batchMax = extractMaxTimestampFromBuckets(buckets);
          maxTimestamp = pickLaterTimestamp(maxTimestamp, batchMax);
        }
      }

      afterKey = agg?.after_key;
      fetchMore = Boolean(afterKey);
    }

    return { entities: allEntities, maxTimestamp };
  };

  const updateDetection: UpdateDetection = async (
    source: MonitoringEntitySource,
    entityStoreEntityIdsByType: EntityStoreEntityIdsByType
  ) => {
    const allEntities: WatchlistBulkEntity[] = [];
    let maxProcessedTimestamp: string | undefined;

    if (source.type === 'entity_analytics_integration') {
      if (!syncMarkersService) {
        logger.warn(
          `[WatchlistSync] Skipping integration source ${source.id}: descriptorClient not available`
        );
        return allEntities;
      }

      const syncMarker = await syncMarkersService.getLastProcessedMarker(source);

      for (const entityType of ALL_ENTITY_TYPES) {
        const allowedEntityIds = getAllowedEntityIds(entityStoreEntityIdsByType, entityType);
        const { entities, maxTimestamp } = await updateDetectionForEntityType(
          source,
          entityType,
          allowedEntityIds,
          syncMarker
        );
        allEntities.push(...entities);
        maxProcessedTimestamp = pickLaterTimestamp(maxProcessedTimestamp, maxTimestamp);
      }

      if (maxProcessedTimestamp) {
        await syncMarkersService.updateLastProcessedMarker(source, maxProcessedTimestamp);
      }
    } else {
      for (const entityType of ALL_ENTITY_TYPES) {
        const allowedEntityIds = getAllowedEntityIds(entityStoreEntityIdsByType, entityType);
        const { entities } = await updateDetectionForEntityType(
          source,
          entityType,
          allowedEntityIds
        );
        allEntities.push(...entities);
      }
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
