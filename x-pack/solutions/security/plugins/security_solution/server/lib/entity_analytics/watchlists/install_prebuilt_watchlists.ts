/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { WatchlistConfigClient } from './management/watchlist_config';

export const installPrebuiltWatchlists = async (
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  namespace: string,
  logger: Logger
) => {
  const watchlistClient = new WatchlistConfigClient({
    soClient,
    esClient,
    namespace,
    logger,
  });

  const PREBUILT_WATCHLISTS = [
    {
      id: 'privileged-user-monitoring-watchlist-id',
      name: 'Privileged Users',
      description: 'System-managed watchlist for tracking privileged users',
      managed: true,
      riskModifier: 50,
    },
  ];

  for (const watchlist of PREBUILT_WATCHLISTS) {
    try {
      await watchlistClient.get(watchlist.id);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes('not found')) {
        logger.info(`Prebuilt watchlist '${watchlist.name}' not found, initializing...`);
        const { id, ...attrs } = watchlist;
        await watchlistClient.create(attrs, { id });
        logger.info(`Prebuilt watchlist '${watchlist.name}' initialized.`);
      } else {
        logger.error(`Error checking prebuilt watchlist '${watchlist.name}': ${errorMessage}`);
      }
    }
  }
};
