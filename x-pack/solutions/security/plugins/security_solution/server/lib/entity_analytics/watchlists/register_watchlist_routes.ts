/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsRoutesDeps } from '../types';
import {
  createWatchlistRoute,
  deleteWatchlistRoute,
  getWatchlistRoute,
  listWatchlistsRoute,
  searchWatchlistIndicesRoute,
  updateWatchlistRoute,
} from './management/routes';
import { registerEntitySourceRoutes } from './management/routes/entity_sources';
import { syncWatchlistRoute } from './management/routes/sync';
import { csvUploadRoute } from './management/routes/csv_upload';

export const registerWatchlistRoutes = ({
  router,
  logger,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  createWatchlistRoute(router, logger);
  deleteWatchlistRoute(router, logger);
  getWatchlistRoute(router, logger);
  listWatchlistsRoute(router, logger);
  searchWatchlistIndicesRoute(router, logger);
  updateWatchlistRoute(router, logger);
  registerEntitySourceRoutes(router, logger);
  syncWatchlistRoute(router, logger);
  csvUploadRoute({ router, logger, getStartServices });
};
