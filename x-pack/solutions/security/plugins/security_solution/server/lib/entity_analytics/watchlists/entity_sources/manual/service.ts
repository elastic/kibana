/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { CRUDClient } from '@kbn/entity-store/server/domain/crud/crud_client';

import { uniq } from 'lodash';

import type { WatchlistEntityAssignResponseItem } from '../../../../../../common/api/entity_analytics/watchlists/entities/assign.gen';
import type { WatchlistEntityUnassignResponseItem } from '../../../../../../common/api/entity_analytics/watchlists/entities/unassign.gen';
import { getErrorFromBulkResponse, errorsMsg, partitionBulkResults } from '../sync/utils';
import { bulkUpsertOperationsFactory } from '../bulk/upsert';
import { addWatchlistAttributeToStore } from '../sync/entity_store_sync';
import { applyBulkRemoveSource } from '../bulk/soft_delete';
import { MANUAL_SOURCE_ID } from './constants';
import type { BulkItemOutcome, WatchlistBulkEntity } from '../types';
import type { WatchlistEntityDoc } from '../../entities/types';
import type { WatchlistsByEuid } from '../../entities/service';
import { getEntityType } from '../../entities/utils';

interface ServiceDeps {
  esClient: ElasticsearchClient;
  crudClient: CRUDClient;
  logger: Logger;
  watchlist: { name: string; id: string; index: string };
}

export type ManualEntityService = ReturnType<typeof createManualEntityService>;

export const createManualEntityService = ({
  esClient,
  crudClient,
  logger,
  watchlist,
}: ServiceDeps) => {
  const executeBulkUpsert = async (
    bulkEntities: WatchlistBulkEntity[]
  ): Promise<BulkItemOutcome<WatchlistBulkEntity>> => {
    const operations = bulkUpsertOperationsFactory(
      logger,
      watchlist
    )({
      entities: bulkEntities,
      sourceLabel: MANUAL_SOURCE_ID,
      targetIndex: watchlist.index,
    });

    if (operations.length === 0) {
      return { succeeded: bulkEntities, failed: [] };
    }

    const resp = await esClient.bulk({ refresh: 'wait_for', body: operations });
    const errors = getErrorFromBulkResponse(resp);
    if (errors.length > 0) {
      logger.error(`[ManualAssign] Bulk upsert errors: ${errorsMsg(errors)}`);
    }
    return partitionBulkResults(resp, bulkEntities);
  };

  const assign = async (euids: string[]) => {
    const uniqueEuids = uniq(euids);
    const foundEntities = await findEntitiesInStore(crudClient, uniqueEuids);
    const foundEuids = new Set(foundEntities.map((e) => e.euid));

    const notFoundItems: WatchlistEntityAssignResponseItem[] = uniqueEuids
      .filter((e) => !foundEuids.has(e))
      .map((euid) => ({
        euid,
        status: 'not_found' as const,
        error: 'Entity not found in entity store',
      }));

    if (foundEntities.length === 0) {
      return buildResponse(uniqueEuids.length, notFoundItems, [], []);
    }

    try {
      const bulkEntities: WatchlistBulkEntity[] = foundEntities.map((e) => ({
        euid: e.euid,
        type: e.type,
        name: e.name,
        sourceId: MANUAL_SOURCE_ID,
        currentWatchlists: e.currentWatchlists,
      }));

      const { succeeded, failed } = await executeBulkUpsert(bulkEntities);

      if (succeeded.length > 0) {
        await addWatchlistAttributeToStore({
          crudClient,
          logger,
          entityRefs: succeeded.map((e) => ({
            euid: e.euid,
            type: e.type,
            currentWatchlists: e.currentWatchlists,
          })),
          watchlistId: watchlist.id,
        });
      }

      const successItems: WatchlistEntityAssignResponseItem[] = succeeded.map((e) => ({
        euid: e.euid,
        status: 'success' as const,
      }));
      const failureItems: WatchlistEntityAssignResponseItem[] = failed.map((f) => ({
        euid: f.entity.euid,
        status: 'failure' as const,
        error: f.error,
      }));

      return buildResponse(uniqueEuids.length, notFoundItems, successItems, failureItems);
    } catch (err) {
      logger.error(`[ManualAssign] Error during assignment: ${err}`);
      const errorMsg = toErrorMessage(err);
      const failureItems: WatchlistEntityAssignResponseItem[] = foundEntities.map((e) => ({
        euid: e.euid,
        status: 'failure' as const,
        error: errorMsg,
      }));
      return buildResponse(uniqueEuids.length, notFoundItems, [], failureItems);
    }
  };

  const unassign = async (euids: string[]) => {
    const uniqueEuids = uniq(euids);
    if (uniqueEuids.length === 0) {
      return buildResponse(0, [], [], []);
    }

    const manualDocs = await findManualWatchlistDocs(esClient, watchlist, uniqueEuids);
    const foundEuids = new Set(manualDocs.map((d) => d.euid));

    const notFoundItems: WatchlistEntityUnassignResponseItem[] = uniqueEuids
      .filter((e) => !foundEuids.has(e))
      .map((euid) => ({
        euid,
        status: 'not_found' as const,
        error: 'Entity not manually assigned to this watchlist',
      }));

    if (manualDocs.length === 0) {
      return buildResponse(uniqueEuids.length, notFoundItems, [], []);
    }

    try {
      const foundEntitiesInStore = await findEntitiesInStore(crudClient, [...foundEuids]);
      const watchlistsByEuid: WatchlistsByEuid = new Map(
        foundEntitiesInStore.map((e) => [e.euid, e.currentWatchlists])
      );

      await applyBulkRemoveSource({
        esClient,
        crudClient,
        logger,
        staleEntities: manualDocs.map((d) => ({ docId: d.docId, sourceId: MANUAL_SOURCE_ID })),
        sourceType: MANUAL_SOURCE_ID,
        watchlistsByEuid,
        watchlist,
      });

      const successItems: WatchlistEntityUnassignResponseItem[] = manualDocs.map((d) => ({
        euid: d.euid,
        status: 'success' as const,
      }));
      return buildResponse(uniqueEuids.length, notFoundItems, successItems, []);
    } catch (err) {
      logger.error(`[ManualUnassign] Error during unassignment: ${err}`);
      const errorMsg = toErrorMessage(err);
      const failureItems: WatchlistEntityUnassignResponseItem[] = manualDocs.map((d) => ({
        euid: d.euid,
        status: 'failure' as const,
        error: errorMsg,
      }));
      return buildResponse(uniqueEuids.length, notFoundItems, [], failureItems);
    }
  };

  return { assign, unassign };
};

const findEntitiesInStore = async (crudClient: CRUDClient, euids: string[]) => {
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

  return entities.flatMap((entity) => {
    const id = entity.entity?.id;
    if (!id) return [];
    return [
      {
        euid: id,
        type: getEntityType(entity as Parameters<typeof getEntityType>[0]),
        name: entity.entity?.name,
        currentWatchlists: normalizeWatchlists(entity.entity?.attributes?.watchlists),
      },
    ];
  });
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

  return response.hits.hits.flatMap((hit) => {
    const euid = hit._source?.entity?.id;
    return hit._id && euid ? [{ docId: hit._id, euid }] : [];
  });
};

const toErrorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const normalizeWatchlists = (raw: unknown): string[] =>
  Array.isArray(raw) ? (raw as string[]) : typeof raw === 'string' ? [raw] : [];

const buildResponse = <T extends { readonly euid: string }>(
  total: number,
  notFoundItems: readonly T[],
  successItems: readonly T[],
  failureItems: readonly T[]
): {
  successful: number;
  failed: number;
  not_found: number;
  total: number;
  items: T[];
} => ({
  successful: successItems.length,
  failed: failureItems.length,
  not_found: notFoundItems.length,
  total,
  items: [...notFoundItems, ...successItems, ...failureItems],
});
