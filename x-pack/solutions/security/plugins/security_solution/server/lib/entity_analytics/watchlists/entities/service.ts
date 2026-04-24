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

/** A single page of entity store results yielded by listEntityStoreEntities. */
export interface EntityStorePageResult {
  entityIdsByType: EntityStoreEntityIdsByType;
  watchlistsByEuid: WatchlistsByEuid;
  /** Only present for index-type identity providers. */
  correlationMap?: CorrelationMap;
  /** The entity.id of the last entity in this page, used for range-based deletion detection. */
  maxEntityId: string;
}

interface WatchlistEntitiesServiceDeps {
  esClient: ElasticsearchClient;
  namespace: string;
  /** Overrides ENTITY_STORE_PAGE_SIZE — intended for tests only. */
  pageSize?: number;
}

export type WatchlistEntitiesService = ReturnType<typeof createWatchlistEntitiesService>;
export const createWatchlistEntitiesService = ({
  esClient,
  namespace,
  pageSize = ENTITY_STORE_PAGE_SIZE,
}: WatchlistEntitiesServiceDeps) => {
  async function* listEntityStoreEntities(
    idp: IdentityProvider
  ): AsyncGenerator<EntityStorePageResult> {
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

    let searchAfter: SortResults | undefined;

    while (true) {
      const response = await esClient.search<EntityStoreEntity>({
        index: getEntitiesAlias(ENTITY_LATEST, namespace),
        size: pageSize,
        sort: [{ 'entity.id': 'asc' }],
        search_after: searchAfter,
        query,
      });

      const hits = response.hits.hits;

      if (hits.length === 0) {
        break;
      }

      const entityIdsByType = createEmptyEntityStoreEntityIdsByType();
      const correlationMap: CorrelationMap = new Map();
      const watchlistsByEuid: WatchlistsByEuid = new Map();

      for (const hit of hits) {
        const record = hit._source;
        if (record?.entity?.id) {
          const entityType = getEntityType(record);
          const euid = record.entity.id;

          entityIdsByType[entityType].push(euid);

          const rawWatchlists = get(record, 'entity.attributes.watchlists');
          const watchlists = Array.isArray(rawWatchlists)
            ? rawWatchlists
            : typeof rawWatchlists === 'string'
            ? [rawWatchlists]
            : undefined;

          if (watchlists) {
            watchlistsByEuid.set(euid, watchlists as string[]);
          }

          if (isIndexSync) {
            const correlationValue = get(record, idp.field);
            if (correlationValue) {
              correlationMap.set(String(correlationValue), { euid, entityType });
            }
          }
        }
      }

      const lastHit = hits[hits.length - 1];
      const maxEntityId = String(lastHit.sort?.[0] ?? '');

      yield {
        entityIdsByType,
        watchlistsByEuid,
        maxEntityId,
        ...(isIndexSync ? { correlationMap } : {}),
      };

      if (hits.length < pageSize) {
        break;
      }
      searchAfter = lastHit.sort;
    }
  }

  return { listEntityStoreEntities };
};

const createEmptyEntityStoreEntityIdsByType = (): EntityStoreEntityIdsByType => ({
  [EntityType.user]: [],
  [EntityType.host]: [],
  [EntityType.service]: [],
  [EntityType.generic]: [],
});

export const ENTITY_STORE_PAGE_SIZE = 10_000;

const integrationToStoreNamespaceMap: Record<IntegrationType, string> = {
  entityanalytics_okta: 'okta',
  entityanalytics_ad: 'active_directory',
};
