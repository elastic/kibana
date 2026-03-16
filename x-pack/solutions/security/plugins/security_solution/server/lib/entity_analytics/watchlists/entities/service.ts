/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import type { WatchlistObject } from '../../../../../common/api/entity_analytics/watchlists/management/common.gen';
import type { Entity as EntityStoreEntity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import { EntityType } from '../../../../../common/entity_analytics/types';
import type { EntityStoreDataClient } from '../../entity_store/entity_store_data_client';
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
  entityStoreDataClient?: Pick<EntityStoreDataClient, 'searchEntities'>;
  namespace: string;
}

export const createWatchlistEntitiesService = ({
  esClient,
  entityStoreDataClient,
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
    if (!entityStoreDataClient) {
      throw new Error('Entity Store data client is required to list entity store entities');
    }

    const { records } = await entityStoreDataClient.searchEntities({
      entityTypes: Object.values(EntityType),
      filterQuery: JSON.stringify({ match_all: {} }),
      page: DEFAULT_ENTITY_STORE_PAGE,
      perPage: DEFAULT_ENTITY_STORE_PER_PAGE,
      sortField: DEFAULT_ENTITY_STORE_SORT_FIELD,
      sortOrder: DEFAULT_ENTITY_STORE_SORT_ORDER,
    });

    const entityIdsByType = createEmptyEntityStoreEntityIdsByType();

    for (const record of records) {
      if (record.entity?.id) {
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
