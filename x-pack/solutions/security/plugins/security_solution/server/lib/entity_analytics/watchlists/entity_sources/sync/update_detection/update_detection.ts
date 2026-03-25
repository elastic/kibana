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
import type { WatchlistDataSources } from '../../../../../../../common/api/entity_analytics';
import type { EntityStoreEntityIdsByType } from '../../../entities/service';
import type { WatchlistBulkEntity } from '../../types';
import { createWatchlistSyncMarkersService } from '../sync_markers';
import type { WatchlistEntitySourceClient } from '../../infra';
import { isTimestampGreaterThan } from '../utils';
import { buildEntitiesSearchBody, buildIndexSourceSearchBody } from './queries';
import { applyBulkUpsert } from '../../bulk/upsert';
import { getEntityNameFromDoc } from './entity_utils';
import type { AfterKey, EntityBucket, EntitiesAggregation, IndexSourceAggregation } from './types';
import type { CorrelationMap } from '../../../entities/types';

export type UpdateDetectionService = ReturnType<typeof createUpdateDetectionService>;

type UpdateDetection = (
  source: WatchlistDataSources.MonitoringEntitySource,
  entityStoreEntityIdsByType: EntityStoreEntityIdsByType,
  correlationMap?: CorrelationMap
) => Promise<WatchlistBulkEntity[]>;

interface MappedBucket {
  euid: string;
  entity: WatchlistBulkEntity;
  timestamp?: string;
}

interface PageResult<B> {
  buckets: B[];
  afterKey: AfterKey;
}

type SearchPage<B> = (afterKey: AfterKey, pageSize: number) => Promise<PageResult<B>>;

type MapBucket<B> = (bucket: B) => MappedBucket | null;

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

const paginatedDetection = async <B>(
  esClient: ElasticsearchClient,
  targetIndex: string,
  search: SearchPage<B>,
  mapBucket: MapBucket<B>
): Promise<{ entities: WatchlistBulkEntity[]; maxTimestamp?: string }> => {
  const pageSize = 100;
  let afterKey: AfterKey;
  let fetchMore = true;
  const allEntities: WatchlistBulkEntity[] = [];
  let maxTimestamp: string | undefined;

  while (fetchMore) {
    const page = await search(afterKey, pageSize);
    const buckets = page.buckets;

    if (buckets.length > 0) {
      const mapped = buckets.reduce<MappedBucket[]>((acc, bucket) => {
        const result = mapBucket(bucket);
        if (result) acc.push(result);
        return acc;
      }, []);

      const batchEuids = mapped.map((m) => m.euid);
      const existingMap = await getExistingEntitiesMap(esClient, targetIndex, batchEuids);

      for (const { euid, entity, timestamp } of mapped) {
        entity.existingEntityId = existingMap.get(euid);
        maxTimestamp = pickLaterTimestamp(maxTimestamp, timestamp);
        allEntities.push(entity);
      }
    }

    afterKey = page.afterKey;
    fetchMore = Boolean(afterKey);
  }

  return { entities: allEntities, maxTimestamp };
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
  descriptorClient?: WatchlistEntitySourceClient;
}) => {
  const syncMarkersService = descriptorClient
    ? createWatchlistSyncMarkersService(descriptorClient)
    : undefined;

  const detectForIntegrationEntityType = async (
    source: WatchlistDataSources.MonitoringEntitySource,
    entityType: EntityType,
    allowedEntityIds: string[],
    syncMarker?: string
  ) => {
    if (allowedEntityIds.length === 0) {
      return { entities: [] as WatchlistBulkEntity[] };
    }

    const search: SearchPage<EntityBucket> = async (afterKey, pageSize) => {
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
      return { buckets: agg?.buckets ?? [], afterKey: agg?.after_key };
    };

    const mapBucket: MapBucket<EntityBucket> = (bucket) => {
      const euid = bucket.key.euid;
      const entity: WatchlistBulkEntity = { euid, type: entityType, sourceId: source.id };

      if (syncMarker && bucket.latest_doc?.hits?.hits?.[0]) {
        const topHit = bucket.latest_doc.hits.hits[0];
        entity.name = getEntityNameFromDoc(
          entityType,
          (topHit._source ?? {}) as Parameters<typeof getEntityNameFromDoc>[1]
        );
      }

      const ts = bucket.latest_doc?.hits?.hits?.[0]?._source?.['@timestamp'];
      return { euid, entity, timestamp: typeof ts === 'string' ? ts : undefined };
    };

    return paginatedDetection(esClient, targetIndex, search, mapBucket);
  };

  const detectForIndexSource = async (
    source: WatchlistDataSources.MonitoringEntitySource,
    correlationMap: CorrelationMap
  ) => {
    const { identifierField } = source;
    if (!identifierField) {
      logger.warn(`[WatchlistSync] Index source ${source.id} missing identifierField, skipping`);
      return { entities: [] as WatchlistBulkEntity[] };
    }

    const correlationValues = Array.from(correlationMap.keys());
    if (correlationValues.length === 0) {
      return { entities: [] as WatchlistBulkEntity[] };
    }

    const search: SearchPage<{ key: { identifier: string }; doc_count: number }> = async (
      afterKey,
      pageSize
    ) => {
      const query = buildIndexSourceSearchBody(
        identifierField,
        correlationValues,
        afterKey,
        pageSize,
        source.queryRule
      );
      const response = await esClient.search<never, IndexSourceAggregation>({
        index: source.indexPattern,
        ...query,
      });
      const agg = response.aggregations?.identifiers;
      return { buckets: agg?.buckets ?? [], afterKey: agg?.after_key };
    };

    const mapBucket: MapBucket<{ key: { identifier: string }; doc_count: number }> = (bucket) => {
      const entry = correlationMap.get(bucket.key.identifier);
      if (!entry) return null;
      return {
        euid: entry.euid,
        entity: { euid: entry.euid, type: entry.entityType, sourceId: source.id },
      };
    };

    return paginatedDetection(esClient, targetIndex, search, mapBucket);
  };

  const updateDetection: UpdateDetection = async (
    source: WatchlistDataSources.MonitoringEntitySource,
    entityStoreEntityIdsByType: EntityStoreEntityIdsByType,
    correlationMap?: CorrelationMap
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
        const { entities, maxTimestamp } = await detectForIntegrationEntityType(
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
      if (!correlationMap) {
        logger.warn(
          `[WatchlistSync] Skipping index source ${source.id}: correlationMap not provided`
        );
        return allEntities;
      }

      const { entities } = await detectForIndexSource(source, correlationMap);
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
