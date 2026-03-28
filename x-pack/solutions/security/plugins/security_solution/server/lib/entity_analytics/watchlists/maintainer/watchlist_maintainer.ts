/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export interface WatchlistMaintainerDeps {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  logger: Logger;
}

type WatchlistMaintainerConfig = Pick<RegisterEntityMaintainerConfig, 'setup' | 'run'>;

export const createWatchlistMaintainer = ({
  getStartServices,
  logger,
}: WatchlistMaintainerDeps): WatchlistMaintainerConfig => ({
  setup: async ({ status }) => {
    const namespace = status.metadata.namespace;

    logger.debug(`Initializing watchlist maintainer for namespace "${namespace}"`);

    // TODO: add watchlist-specific setup logic here (e.g. saved objects, data client init)
    // Add in call to pre-built watchlists install
    logger.info(`Watchlist maintainer setup completed for namespace "${namespace}"`);
    return status.state;
  },
  run: async ({ status }) => {
    logger.debug('Watchlist maintainer run');

    // TODO: add watchlist-specific run logic here (e.g. sync, license/feature checks)

    return status.state;
  },
});

export type RegisterWatchlistMaintainerDeps = WatchlistMaintainerDeps;
