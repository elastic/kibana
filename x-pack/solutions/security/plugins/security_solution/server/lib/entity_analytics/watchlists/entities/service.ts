/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getLatestEntitiesIndexName } from '@kbn/entity-store/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';

import { get } from 'lodash';
import type { Entity as EntityStoreEntity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import { EntityType } from '../../../../../common/entity_analytics/types';

import type { IntegrationType } from '../entity_sources/infra';
import type { CorrelationMap } from './types';

export type EntityStoreEntityIdsByType = Record<EntityType, string[]>;

export type IdentityProvider =
  | { type: 'integration'; name: IntegrationType }
  | { type: 'index'; field: string };

export interface IndexSourceResult {
  entityIdsByType: EntityStoreEntityIdsByType;
  correlationMap: CorrelationMap;
}

interface WatchlistEntitiesServiceDeps {
  esClient: ElasticsearchClient;
  namespace: string;
}

export type WatchlistEntitiesService = ReturnType<typeof createWatchlistEntitiesService>;
export const createWatchlistEntitiesService = ({
  esClient,
  namespace,
}: WatchlistEntitiesServiceDeps) => {
  function listEntityStoreEntities(
    idp: IdentityProvider & { type: 'index' }
  ): Promise<IndexSourceResult>;
  function listEntityStoreEntities(
    idp: IdentityProvider & { type: 'integration' }
  ): Promise<EntityStoreEntityIdsByType>;
  async function listEntityStoreEntities(
    idp: IdentityProvider
  ): Promise<EntityStoreEntityIdsByType | IndexSourceResult> {
    const isIndexSync = idp.type === 'index';

    const query =
      idp.type === 'integration'
        ? { term: { 'entity.namespace': integrationToStoreNamespaceMap[idp.name] } }
        : { exists: { field: idp.field } };

    const entityIdsByType = createEmptyEntityStoreEntityIdsByType();
    const correlationMap: CorrelationMap = new Map();

    let searchAfter: SortResults | undefined;
    let fetchMore = true;

    while (fetchMore) {
      const response = await esClient.search<EntityStoreEntity>({
        index: getLatestEntitiesIndexName(namespace),
        size: 1000,
        sort: ['_doc'],
        search_after: searchAfter,
        query,
      });

      const hits = response.hits.hits;

      if (hits.length === 0) {
        fetchMore = false;
        break;
      }

      hits.reduce(
        (acc, hit) => {
          const record = hit._source;
          if (!record?.entity?.id) return acc;

          const entityType = getEntityType(record);
          const euid = record.entity.id;

          acc.entityIdsByType[entityType].push(euid);

          if (!isIndexSync) {
            return acc;
          }

          const correlationValue = get(record, idp.field);
          if (!correlationValue) {
            return acc;
          }

          acc.correlationMap.set(String(correlationValue), { euid, entityType });
          return acc;
        },
        { entityIdsByType, correlationMap }
      );

      searchAfter = hits[hits.length - 1].sort;
    }

    const deduped = dedup(entityIdsByType);
    return isIndexSync ? { entityIdsByType: deduped, correlationMap } : deduped;
  }
  return { listEntityStoreEntities };
};

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

const dedup = (entityIdsByType: EntityStoreEntityIdsByType): EntityStoreEntityIdsByType =>
  Object.fromEntries(
    Object.entries(entityIdsByType).map(([et, ids]) => [et, Array.from(new Set(ids))])
  ) as EntityStoreEntityIdsByType;
