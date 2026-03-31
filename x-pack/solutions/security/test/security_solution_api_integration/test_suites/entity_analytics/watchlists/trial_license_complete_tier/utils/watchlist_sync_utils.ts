/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export const WatchlistSyncUtils = (
  getService: FtrProviderContext['getService'],
  sourceIndexName: string
) => {
  const log = getService('log');
  const es = getService('es');
  const entityAnalyticsApi = getService('entityAnalyticsApi');

  const createSourceIndex = async () =>
    es.indices.create({
      index: sourceIndexName,
      mappings: {
        properties: {
          user: {
            properties: {
              name: {
                type: 'keyword',
              },
            },
          },
        },
      },
    });

  const addUsersToSourceIndex = async (users: string[]) => {
    const ops = users.flatMap((name) => [{ index: {} }, { user: { name } }]);
    await es.bulk({
      index: sourceIndexName,
      body: ops,
      refresh: true,
    });
  };

  const deleteSourceIndex = async () => {
    await es.indices.delete({ index: sourceIndexName }, { ignore: [404] }).catch((err) => {
      log.error(`Error deleting index ${sourceIndexName}: ${err}`);
    });
  };

  const createWatchlistAndEntitySource = async (watchlistName: string) => {
    const { body: watchlist } = await entityAnalyticsApi.createWatchlist({
      body: {
        name: watchlistName,
        description: `Test watchlist for ${watchlistName}`,
        riskModifier: 10,
      },
    });

    log.info(`Created watchlist: ${JSON.stringify(watchlist)}`);

    const { body: entitySource } = await entityAnalyticsApi.createWatchlistEntitySource({
      params: { watchlist_id: watchlist.id },
      body: {
        type: 'index',
        name: `Source for ${sourceIndexName}`,
        indexPattern: sourceIndexName,
        enabled: true,
      },
    });

    log.info(`Created entity source: ${JSON.stringify(entitySource)}`);

    return { watchlistId: watchlist.id, entitySourceId: entitySource.id };
  };

  const syncWatchlist = async (watchlistId: string) => {
    const response = await entityAnalyticsApi.syncWatchlist({
      params: { watchlist_id: watchlistId },
    });

    expect(response.status).toBe(200);
    return response;
  };

  const queryWatchlistIndex = async (watchlistName: string, namespace: string = 'default') => {
    const indexName = `.entity-analytics.watchlists.${watchlistName}-${namespace}`;

    const response = await es.search({
      index: indexName,
      size: 1000,
      query: { match_all: {} },
    });

    return response.hits.hits.map((hit) => hit._source as Record<string, unknown>);
  };

  const findEntity = (
    entities: Array<Record<string, unknown>>,
    euid: string
  ): Record<string, unknown> | undefined =>
    entities.find((e) => {
      const entity = e.entity as { id?: string } | undefined;
      return entity?.id === euid;
    });

  const deleteWatchlistIndex = async (watchlistName: string, namespace: string = 'default') => {
    const indexName = `.entity-analytics.watchlists.${watchlistName}-${namespace}`;
    await es.indices.delete({ index: indexName }, { ignore: [404] }).catch((err) => {
      log.error(`Error deleting watchlist index ${indexName}: ${err}`);
    });
  };

  return {
    createSourceIndex,
    addUsersToSourceIndex,
    deleteSourceIndex,
    createWatchlistAndEntitySource,
    syncWatchlist,
    queryWatchlistIndex,
    findEntity,
    deleteWatchlistIndex,
  };
};
