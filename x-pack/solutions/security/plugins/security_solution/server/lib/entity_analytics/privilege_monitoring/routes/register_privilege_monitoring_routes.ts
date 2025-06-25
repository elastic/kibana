/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsRoutesDeps } from '../../types';
import { createPrivilegeMonitoringIndicesRoute } from './create_index';
import { healthCheckPrivilegeMonitoringRoute } from './health';
import { initPrivilegeMonitoringEngineRoute } from './init';
import {
  monitoringEntitySourceRoute,
  listMonitoringEntitySourceRoute,
} from './monitoring_entity_source';
import { searchPrivilegeMonitoringIndicesRoute } from './search_indices';

import {
  createUserRoute,
  deleteUserRoute,
  listUsersRoute,
  updateUserRoute,
  uploadUsersCSVRoute,
} from './users';

import { padInstallRoute } from './privileged_access_detection/pad_install';
import { padGetStatusRoute } from './privileged_access_detection/pad_get_installation_status';

export const registerPrivilegeMonitoringRoutes = ({
  router,
  logger,
  config,
}: EntityAnalyticsRoutesDeps) => {
  padInstallRoute(router, logger, config);
  padGetStatusRoute(router, logger, config);
  initPrivilegeMonitoringEngineRoute(router, logger, config);
  healthCheckPrivilegeMonitoringRoute(router, logger, config);
  searchPrivilegeMonitoringIndicesRoute(router, logger);
  createPrivilegeMonitoringIndicesRoute(router, logger);
  monitoringEntitySourceRoute(router, logger, config);
  listMonitoringEntitySourceRoute(router, logger, config);
  createUserRoute(router, logger);
  deleteUserRoute(router, logger);
  listUsersRoute(router, logger);
  updateUserRoute(router, logger);
  uploadUsersCSVRoute(router, logger, config);
};
