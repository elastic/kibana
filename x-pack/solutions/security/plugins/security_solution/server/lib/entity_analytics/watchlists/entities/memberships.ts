/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core-saved-objects-server';
import type { EntityWatchlistMembership } from '../../../../../common/api/entity_analytics/watchlists/entities/memberships.gen';
import type { MonitoringEntitySource } from '../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
import { watchlistEntitySourceTypeName } from '../entity_sources/infra';
import { MANUAL_SOURCE_ID } from '../entity_sources/manual/constants';
import { getIndexForWatchlist } from './utils';

const MAX_MEMBERSHIPS = 1000;

interface MembershipDocSource {
  watchlist?: { id?: string };
  labels?: { source_ids?: string[] };
}

/**
 * Lists the watchlists an entity belongs to and why: manual assignment and/or the entity sources
 * (rules, indices, integrations) that added it.
 */
export const getEntityWatchlistMemberships = async ({
  esClient,
  soClient,
  namespace,
  euid,
}: {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  namespace: string;
  euid: string;
}): Promise<EntityWatchlistMembership[]> => {
  const response = await esClient.search<MembershipDocSource>({
    index: getIndexForWatchlist(namespace),
    ignore_unavailable: true,
    size: MAX_MEMBERSHIPS,
    query: { term: { 'entity.id': euid } },
    _source: ['watchlist.id', 'labels.source_ids'],
  });

  const docs = response.hits.hits.flatMap(({ _source }) => {
    const watchlistId = _source?.watchlist?.id;
    return watchlistId ? [{ watchlistId, sourceIds: _source?.labels?.source_ids ?? [] }] : [];
  });

  const sourceIds = [
    ...new Set(docs.flatMap(({ sourceIds: ids }) => ids).filter((id) => id !== MANUAL_SOURCE_ID)),
  ];

  const sourcesById = new Map<string, MonitoringEntitySource>();
  if (sourceIds.length > 0) {
    const { saved_objects: savedObjects } = await soClient.bulkGet<MonitoringEntitySource>(
      sourceIds.map((id) => ({ type: watchlistEntitySourceTypeName, id }))
    );
    for (const savedObject of savedObjects) {
      if (!isSavedObjectErrorResult(savedObject)) {
        sourcesById.set(savedObject.id, { ...savedObject.attributes, id: savedObject.id });
      }
    }
  }

  return docs.map(({ watchlistId, sourceIds: ids }) => ({
    watchlistId,
    manual: ids.includes(MANUAL_SOURCE_ID),
    sources: ids
      .filter((id) => id !== MANUAL_SOURCE_ID)
      .map((id) => {
        const source = sourcesById.get(id);
        return { id, name: source?.name, type: source?.type };
      }),
  }));
};
