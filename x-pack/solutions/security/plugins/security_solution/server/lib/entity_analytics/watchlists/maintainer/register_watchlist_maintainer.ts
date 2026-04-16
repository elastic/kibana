/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreSetupContract } from '@kbn/entity-store/server';
import {
  createWatchlistMaintainer,
  type RegisterWatchlistMaintainerDeps,
} from './watchlist_maintainer';

const WATCHLIST_MAINTAINER_INTERVAL = '10m';

export const registerWatchlistMaintainer = ({
  entityStore,
  ...deps
}: RegisterWatchlistMaintainerDeps & {
  entityStore: EntityStoreSetupContract | undefined;
}): void => {
  if (!entityStore) {
    deps.logger.info('Entity Store is unavailable; skipping watchlist maintainer registration.');
    return;
  }

  const maintainer = createWatchlistMaintainer(deps);

  entityStore.registerEntityMaintainer({
    id: 'watchlist',
    description: 'Entity Analytics Watchlist Maintainer',
    interval: WATCHLIST_MAINTAINER_INTERVAL,
    timeout: '9m',
    initialState: {},
    setup: maintainer.setup,
    run: maintainer.run,
  });
};
