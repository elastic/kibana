/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CRUDClient } from '@kbn/entity-store/server/domain/crud/crud_client';
import type { EntityType } from '@kbn/entity-store/common';
import { uniq } from 'lodash';

import type { WatchlistEntityAssignResponseItem } from '../../../../../../common/api/entity_analytics/watchlists/entities/assign.gen';
import type { WatchlistEntityUnassignResponseItem } from '../../../../../../common/api/entity_analytics/watchlists/entities/unassign.gen';
import { getExistingEntitiesMap, getErrorFromBulkResponse, errorsMsg } from '../sync/utils';
import { bulkUpsertOperationsFactory } from '../bulk/upsert';
import { addWatchlistAttributeToStore } from '../sync/entity_store_sync';
import { applyBulkRemoveSource } from '../bulk/soft_delete';
import { MANUAL_SOURCE_ID } from './constants';
import type { WatchlistBulkEntity } from '../types';
import type { WatchlistEntityDoc } from '../../entities/types';
import type { WatchlistsByEuid } from '../../entities/service';
import { getEntityType } from '../../entities/utils';

interface ServiceDeps {
  esClient: ElasticsearchClient;
  crudClient: CRUDClient;
  logger: Logger;
  watchlist: { name: string; id: string; index: string };
}

interface FoundEntity {
  euid: string;
  type: EntityType;
  name?: string;
  currentWatchlists: string[];
}

const findEntitiesInStore = async (
  crudClient: CRUDClient,
  euids: string[]
): Promise<FoundEntity[]> => {
  const uniqueEuids = uniq(euids);
  if (uniqueEuids.length === 0) return [];

  const { entities } = await crudClient.listEntities({
    filter: { terms: { 'entity.id': uniqueEuids } },
    size: uniqueEuids.length,
    source: [
      'entity.id',
      'entity.type',
      'entity.name',
      'entity.EngineMetadata.Type',
      'entity.attributes.watchlists',
    ],
  });

  return entities.reduce<FoundEntity[]>((acc, entity) => {
    if (!entity.entity?.id) return acc;

    const type = getEntityType(entity as Parameters<typeof getEntityType>[0]);
    const rawWatchlists = entity.entity?.attributes?.watchlists;
    const currentWatchlists = Array.isArray(rawWatchlists)
      ? (rawWatchlists as string[])
      : typeof rawWatchlists === 'string'
      ? [rawWatchlists]
      : [];

    acc.push({
      euid: entity.entity.id,
      type,
      name: entity.entity?.name,
      currentWatchlists,
    });
    return acc;
  }, []);
};

const findManualWatchlistDocs = async (
  esClient: ElasticsearchClient,
  watchlist: { id: string; index: string },
  euids: string[]
) => {
  const response = await esClient.search<WatchlistEntityDoc>({
    index: watchlist.index,
    size: euids.length,
    query: {
      bool: {
        must: [
          { terms: { 'entity.id': euids } },
          { term: { 'watchlist.id': watchlist.id } },
          { term: { 'labels.source_ids': MANUAL_SOURCE_ID } },
        ],
      },
    },
    _source: ['entity.id'],
  });

  return response.hits.hits.reduce<{ docId: string; euid: string }[]>((acc, hit) => {
    const euid = hit._source?.entity?.id;
    if (hit._id && euid) {
      acc.push({ docId: hit._id, euid });
    }
    return acc;
  }, []);
};

export type ManualEntityService = ReturnType<typeof createManualEntityService>;

export const createManualEntityService = ({
  esClient,
  crudClient,
  logger,
  watchlist,
}: ServiceDeps) => {
  const assign = async (euids: string[]) => {
    const uniqueEuids = uniq(euids);
    const foundEntities = await findEntitiesInStore(crudClient, uniqueEuids);
    const foundEuids = new Set(foundEntities.map((e) => e.euid));
    const notFoundEuids = uniqueEuids.filter((e) => !foundEuids.has(e));

    const items: WatchlistEntityAssignResponseItem[] = notFoundEuids.map((euid) => ({
      euid,
      status: 'not_found',
      error: 'Entity not found in entity store',
    }));

    if (foundEntities.length === 0) {
      return {
        successful: 0,
        failed: 0,
        not_found: notFoundEuids.length,
        total: uniqueEuids.length,
        items,
      };
    }

    try {
      const existingMap = await getExistingEntitiesMap(esClient, watchlist, Array.from(foundEuids));
      const bulkEntities: WatchlistBulkEntity[] = foundEntities.map((e) => ({
        euid: e.euid,
        type: e.type,
        name: e.name,
        sourceId: MANUAL_SOURCE_ID,
        existingEntityId: existingMap.get(e.euid),
        currentWatchlists: e.currentWatchlists,
      }));

      const operations = bulkUpsertOperationsFactory(
        logger,
        watchlist
      )({
        entities: bulkEntities,
        sourceLabel: MANUAL_SOURCE_ID,
        targetIndex: watchlist.index,
      });

      if (operations.length > 0) {
        const resp = await esClient.bulk({ refresh: 'wait_for', body: operations });
        const errors = getErrorFromBulkResponse(resp);
        if (errors.length > 0) {
          logger.error(`[ManualAssign] Bulk upsert errors: ${errorsMsg(errors)}`);
        }
      }

      await addWatchlistAttributeToStore({
        crudClient,
        logger,
        entityRefs: bulkEntities.map((e) => ({
          euid: e.euid,
          type: e.type,
          currentWatchlists: e.currentWatchlists,
        })),
        watchlistId: watchlist.id,
      });

      items.push(
        ...foundEntities.map((e) => ({
          euid: e.euid,
          status: 'success' as const,
        }))
      );

      return {
        successful: foundEntities.length,
        failed: 0,
        not_found: notFoundEuids.length,
        total: uniqueEuids.length,
        items,
      };
    } catch (err) {
      logger.error(`[ManualAssign] Error during assignment: ${err}`);
      items.push(
        ...foundEntities.map((e) => ({
          euid: e.euid,
          status: 'failure' as const,
          error: err instanceof Error ? err.message : String(err),
        }))
      );

      return {
        successful: 0,
        failed: foundEntities.length,
        not_found: notFoundEuids.length,
        total: uniqueEuids.length,
        items,
      };
    }
  };

  const unassign = async (euids: string[]) => {
    const uniqueEuids = uniq(euids);
    if (uniqueEuids.length === 0) {
      return { successful: 0, failed: 0, not_found: 0, total: 0, items: [] };
    }

    const manualDocs = await findManualWatchlistDocs(esClient, watchlist, uniqueEuids);
    const foundEuids = new Set(manualDocs.map((d) => d.euid));
    const notFoundEuids = uniqueEuids.filter((e) => !foundEuids.has(e));

    const items: WatchlistEntityUnassignResponseItem[] = notFoundEuids.map((euid) => ({
      euid,
      status: 'not_found',
      error: 'Entity not manually assigned to this watchlist',
    }));

    if (manualDocs.length === 0) {
      return {
        successful: 0,
        failed: 0,
        not_found: notFoundEuids.length,
        total: uniqueEuids.length,
        items,
      };
    }

    try {
      const foundEntitiesInStore = await findEntitiesInStore(crudClient, Array.from(foundEuids));
      const watchlistsByEuid: WatchlistsByEuid = new Map(
        foundEntitiesInStore.map((e) => [e.euid, e.currentWatchlists])
      );

      const staleEntities = manualDocs.map((d) => ({
        docId: d.docId,
        sourceId: MANUAL_SOURCE_ID,
      }));

      await applyBulkRemoveSource({
        esClient,
        crudClient,
        logger,
        staleEntities,
        sourceType: MANUAL_SOURCE_ID,
        watchlistsByEuid,
        watchlist,
      });

      items.push(
        ...manualDocs.map((d) => ({
          euid: d.euid,
          status: 'success' as const,
        }))
      );

      return {
        successful: manualDocs.length,
        failed: 0,
        not_found: notFoundEuids.length,
        total: uniqueEuids.length,
        items,
      };
    } catch (err) {
      logger.error(`[ManualUnassign] Error during unassignment: ${err}`);
      items.push(
        ...manualDocs.map((d) => ({
          euid: d.euid,
          status: 'failure' as const,
          error: err instanceof Error ? err.message : String(err),
        }))
      );

      return {
        successful: 0,
        failed: manualDocs.length,
        not_found: notFoundEuids.length,
        total: uniqueEuids.length,
        items,
      };
    }
  };

  return { assign, unassign };
};
