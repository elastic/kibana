/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EntityStoreSetupContract } from '@kbn/entity-store/server';
import { getRequestSavedObjectClient } from '../shared/utils';
import { WatchlistConfigClient } from '../management/watchlist_config';
import { ensurePrebuiltWatchlists } from './install_prebuilt_watchlists';

export const registerEntityStorePostInstallHook = ({
  entityStore,
  logger,
}: {
  entityStore?: EntityStoreSetupContract;
  logger: Logger;
}) => {
  if (!entityStore) {
    return;
  }

  entityStore.registerPostInstallHook(async ({ core, namespace }) => {
    const soClient = getRequestSavedObjectClient(core);
    const watchlistClient = new WatchlistConfigClient({
      namespace,
      soClient,
      esClient: core.elasticsearch.client.asCurrentUser,
      logger,
    });

    await ensurePrebuiltWatchlists({ watchlistClient, soClient, namespace, logger });
  });
};
