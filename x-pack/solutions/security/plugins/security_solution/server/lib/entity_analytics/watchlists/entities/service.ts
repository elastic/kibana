/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import { getLatestEntitiesIndexName } from '@kbn/entity-store/server';
import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { Entity as EntityStoreEntity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { getIndexForWatchlist } from './utils';
import type { WatchlistEntityDoc } from './types';

export type WatchlistEntitiesService = ReturnType<typeof createWatchlistEntitiesService>;

export type EntityStoreEntityIdsByType = Record<EntityType, string[]>;

const DEFAULT_ENTITY_STORE_PAGE = 1;
const DEFAULT_ENTITY_STORE_PER_PAGE = 10_000;
const DEFAULT_ENTITY_STORE_SORT_FIELD = '@timestamp';
const DEFAULT_ENTITY_STORE_SORT_ORDER: SortOrder = 'desc';

const createEmptyEntityStoreEntityIdsByType = (): EntityStoreEntityIdsByType => ({
  [EntityType.user]: [],
  [EntityType.host]: [],
  [EntityType.service]: [],
  [EntityType.generic]: [],
});

const getEntityType = (record: EntityStoreEntity): EntityType => {
  const entityType = record.entity.EngineMetadata?.Type || record.entity.type;

  if (!entityType || !Object.values(EntityType).includes(entityType as EntityType)) {
    throw new Error(`Unexpected entity store record: ${JSON.stringify(record)}`);
  }

  return EntityType[entityType as keyof typeof EntityType];
};

interface WatchlistEntitiesServiceDeps {
  esClient: ElasticsearchClient;
  namespace: string;
}

export const createWatchlistEntitiesService = ({
  esClient,
  namespace,
}: WatchlistEntitiesServiceDeps) => {
  const list = async (
    watchlist: WatchlistObject,
    _rangeClauseKQL?: string
  ): Promise<WatchlistEntityDoc[]> => {
    const index = getIndexForWatchlist(watchlist.name, namespace);

    const response = await esClient.search<WatchlistEntityDoc>({
      index,
      size: 10_000,
      query: { match_all: {} },
      // _source: ['@timestamp', 'entity', 'labels'],
    });

    return response.hits.hits
      .map((hit) => hit._source)
      .filter(
        (source): source is WatchlistEntityDoc =>
          source != null && source.entity != null && typeof source.entity.id === 'string'
      );
  };

  const listEntityStoreEntities = async (): Promise<EntityStoreEntityIdsByType> => {
    const response = await esClient.search<EntityStoreEntity>({
      index: getLatestEntitiesIndexName(namespace),
      query: {
        term: {
          'entity.namespace': 'okta',
        },
      },
    });

    const entityIdsByType = createEmptyEntityStoreEntityIdsByType();

    for (const hit of response.hits.hits) {
      const record = hit._source;

      if (record?.entity?.id) {
        const entityType = getEntityType(record);
        entityIdsByType[entityType].push(record.entity.id);
      }
    }

    return Object.fromEntries(
      Object.entries(entityIdsByType).map(([entityType, entityIds]) => [
        entityType,
        Array.from(new Set(entityIds)),
      ])
    ) as EntityStoreEntityIdsByType;
  };

  return { list, listEntityStoreEntities };
};
