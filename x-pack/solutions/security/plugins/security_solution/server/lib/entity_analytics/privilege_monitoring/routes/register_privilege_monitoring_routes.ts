/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsRoutesDeps } from '../../types';
import { healthCheckPrivilegeMonitoringRoute } from './health';
import { initPrivilegeMonitoringEngineRoute } from './init';
import { searchPrivilegeMonitoringIndicesRoute } from './search_indices';

import {
  getUserRoute,
  createUserRoute,
  deleteUserRoute,
  listUsersRoute,
  updateUserRoute,
  uploadUsersCSVRoute,
  uploadUsersJSONRoute,
} from './users';

export const registerPrivilegeMonitoringRoutes = ({
  router,
  logger,
  getStartServices,
  config,
}: EntityAnalyticsRoutesDeps) => {
  initPrivilegeMonitoringEngineRoute(router, logger, config);
  healthCheckPrivilegeMonitoringRoute(router, logger, config);
  searchPrivilegeMonitoringIndicesRoute(router, logger, config);
  getUserRoute(router, logger, getStartServices);
  createUserRoute(router, logger, getStartServices);
  deleteUserRoute(router, logger, getStartServices);
  listUsersRoute(router, logger, getStartServices);
  updateUserRoute(router, logger, getStartServices);
  uploadUsersCSVRoute(router, logger, getStartServices);
  uploadUsersJSONRoute(router, logger, getStartServices);
};
