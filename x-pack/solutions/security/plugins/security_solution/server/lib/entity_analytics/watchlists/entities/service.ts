/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getLatestEntitiesIndexName } from '@kbn/entity-store/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';

import type { Entity as EntityStoreEntity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import { EntityType } from '../../../../../common/entity_analytics/types';

import type { IntegrationType } from '../../privilege_monitoring/data_sources';

export type WatchlistEntitiesService = ReturnType<typeof createWatchlistEntitiesService>;

export type EntityStoreEntityIdsByType = Record<EntityType, string[]>;

export type IdentityProvider =
  | { type: 'integration'; name: IntegrationType }
  | { type: 'index'; field: string };

const createEmptyEntityStoreEntityIdsByType = (): EntityStoreEntityIdsByType => ({
  [EntityType.user]: [],
  [EntityType.host]: [],
  [EntityType.service]: [],
  [EntityType.generic]: [],
});

const integrationToStoreNamespaceMap: Record<IntegrationType, string> = {
  entityanalytics_okta: 'okta',
  entityanalytics_ad: 'active_directory',
};

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
  const listEntityStoreEntities = async (
    idp: IdentityProvider
  ): Promise<EntityStoreEntityIdsByType> => {
    const query =
      idp.type === 'integration'
        ? {
            term: {
              'entity.namespace': integrationToStoreNamespaceMap[idp.name],
            },
          }
        : {
            exists: {
              field: idp.field,
            },
          };

    const entityIdsByType = createEmptyEntityStoreEntityIdsByType();

    let searchAfter: SortResults | undefined;
    let fetchMore = true;

    while (fetchMore) {
      const response = await esClient.search<EntityStoreEntity>({
        index: getLatestEntitiesIndexName(namespace),
        size: 1000,
        search_after: searchAfter,
        query,
      });

      const hits = response.hits.hits;

      if (hits.length === 0) {
        fetchMore = false;
        break; // We've reached the end!
      }

      for (const hit of hits) {
        const record = hit._source;
        if (record?.entity?.id) {
          const entityType = getEntityType(record);
          entityIdsByType[entityType].push(record.entity.id);
        }
      }

      // Grab the sort cursor from the very last hit to use in the next loop
      searchAfter = hits[hits.length - 1].sort;
    }

    return Object.fromEntries(
      Object.entries(entityIdsByType).map(([entityType, entityIds]) => [
        entityType,
        Array.from(new Set(entityIds)),
      ])
    ) as EntityStoreEntityIdsByType;
  };

  return { listEntityStoreEntities };
};
