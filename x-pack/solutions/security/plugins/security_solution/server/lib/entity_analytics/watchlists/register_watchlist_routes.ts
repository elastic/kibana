/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsRoutesDeps } from '../types';
import {
  createWatchlistRoute,
  getWatchlistRoute,
  listWatchlistsRoute,
  updateWatchlistRoute,
} from './management/routes';

export const registerWatchlistRoutes = ({ router, logger }: EntityAnalyticsRoutesDeps) => {
  createWatchlistRoute(router, logger);
  getWatchlistRoute(router, logger);
  listWatchlistsRoute(router, logger);
  updateWatchlistRoute(router, logger);
};
