/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { EntityAnalyticsRoutesDeps } from '../../../../types';
import { assignWatchlistEntitiesRoute } from './assign';
import { unassignWatchlistEntitiesRoute } from './unassign';

export const registerManualEntityRoutes = (
  router: EntityAnalyticsRoutesDeps['router'],
  logger: Logger
) => {
  assignWatchlistEntitiesRoute(router, logger);
  unassignWatchlistEntitiesRoute(router, logger);
};
