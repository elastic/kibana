/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createOrUpdateIndex } from '../../utils/create_or_update_index';
import { generateWatchlistEntityIndexMappings } from './mappings';
import { getIndexForWatchlist } from './utils';

interface WatchlistIndexParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  namespace: string;
}

/**
 * Creates the per-space watchlist backing index, or updates its mappings and settings when it
 * already exists.
 * The index is hidden, so `esClient` must be the internal client (it attaches the
 * `x-elastic-product-origin: kibana` header). Only call this from server-owned
 * contexts (startup migration, background tasks), never from a request handler.
 */
export const installWatchlistIndex = async ({
  esClient,
  logger,
  namespace,
}: WatchlistIndexParams): Promise<void> => {
  await createOrUpdateIndex({
    esClient,
    logger,
    options: {
      index: getIndexForWatchlist(namespace),
      mappings: generateWatchlistEntityIndexMappings(),
      settings: { hidden: true, auto_expand_replicas: '0-1' },
    },
  });
};

/**
 * Creates the per-space watchlist backing index only when it does not exist yet. It never touches an existing index.
 */
export const ensureWatchlistIndex = async (params: WatchlistIndexParams): Promise<void> => {
  const { esClient, namespace } = params;
  if (await esClient.indices.exists({ index: getIndexForWatchlist(namespace) })) {
    return;
  }

  await installWatchlistIndex(params);
};
