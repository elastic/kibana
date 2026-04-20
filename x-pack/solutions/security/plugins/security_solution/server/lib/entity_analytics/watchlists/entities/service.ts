/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import { get } from 'lodash';
import type { Entity as EntityStoreEntity } from '../../../../../common/api/entity_analytics/entity_store/entities/common.gen';
import { EntityType } from '../../../../../common/entity_analytics/types';

import type { IntegrationType } from '../entity_sources/infra';
import type { CorrelationMap } from './types';
import { getEntityType } from './utils';

export type EntityStoreEntityIdsByType = Record<EntityType, string[]>;

/** Maps EUID → current watchlist names from the entity store */
export type WatchlistsByEuid = Map<string, string[]>;

export type IdentityProvider =
  | { type: 'integration'; name: IntegrationType }
  | { type: 'index'; field: string }
  | { type: 'store'; queryRule: string };

export interface EntityStoreQueryResult {
  entityIdsByType: EntityStoreEntityIdsByType;
  watchlistsByEuid: WatchlistsByEuid;
}

export type IndexSourceQueryResult = EntityStoreQueryResult & {
  correlationMap: CorrelationMap;
};

type EntityStoreResultFor<T extends IdentityProvider['type']> = T extends 'index'
  ? IndexSourceQueryResult
  : EntityStoreQueryResult;

interface WatchlistEntitiesServiceDeps {
  esClient: ElasticsearchClient;
  namespace: string;
}

export type WatchlistEntitiesService = ReturnType<typeof createWatchlistEntitiesService>;
export const createWatchlistEntitiesService = ({
  esClient,
  namespace,
}: WatchlistEntitiesServiceDeps) => {
  async function listEntityStoreEntities<T extends IdentityProvider['type']>(
    idp: IdentityProvider
  ): Promise<EntityStoreResultFor<T>> {
    const isIndexSync = idp.type === 'index';

    const query = (() => {
      if (idp.type === 'index') {
        return { exists: { field: idp.field } };
      }
      if (idp.type === 'integration') {
        return { term: { 'entity.namespace': integrationToStoreNamespaceMap[idp.name] } };
      }
      if (idp.type === 'store') {
        return toElasticsearchQuery(fromKueryExpression(idp.queryRule));
      }
      throw new Error(`Unsupported identity provider: ${JSON.stringify(idp)}`);
    })();

    const entityIdsByType = createEmptyEntityStoreEntityIdsByType();
    const correlationMap: CorrelationMap = new Map();
    const watchlistsByEuid: WatchlistsByEuid = new Map();

    let searchAfter: SortResults | undefined;
    let fetchMore = true;

    while (fetchMore) {
      const response = await esClient.search<EntityStoreEntity>({
        index: getEntitiesAlias(ENTITY_LATEST, namespace),
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

          const rawWatchlists = get(record, 'entity.attributes.watchlists');
          const watchlists = Array.isArray(rawWatchlists)
            ? rawWatchlists
            : typeof rawWatchlists === 'string'
            ? [rawWatchlists]
            : undefined;

          if (watchlists) {
            acc.watchlistsByEuid.set(euid, watchlists as string[]);
          }

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
        { entityIdsByType, correlationMap, watchlistsByEuid }
      );

      searchAfter = hits[hits.length - 1].sort;
    }

    const deduped = dedup(entityIdsByType);
    return (
      isIndexSync
        ? { entityIdsByType: deduped, correlationMap, watchlistsByEuid }
        : { entityIdsByType: deduped, watchlistsByEuid }
    ) as EntityStoreResultFor<T>;
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

const dedup = (entityIdsByType: EntityStoreEntityIdsByType): EntityStoreEntityIdsByType =>
  Object.fromEntries(
    Object.entries(entityIdsByType).map(([et, ids]) => [et, Array.from(new Set(ids))])
  ) as EntityStoreEntityIdsByType;
