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
import { scheduleNowMonitoringEngineRoute } from './schedule_now';
import { registerMonitoringEntitySourceRoutes } from './monitoring_entity_source';
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
import { disablePrivilegeMonitoringEngineRoute } from './disable';
import { privilegesCheckPrivilegeMonitoringRoute } from './privileges';
import { deletePrivilegeMonitoringEngineRoute } from './delete';

export const registerPrivilegeMonitoringRoutes = ({
  router,
  logger,
  config,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  padInstallRoute(router, logger, config);
  padGetStatusRoute(router, logger, config);
  initPrivilegeMonitoringEngineRoute(router, logger, config);
  scheduleNowMonitoringEngineRoute(router, logger, config);
  deletePrivilegeMonitoringEngineRoute(router, logger);
  healthCheckPrivilegeMonitoringRoute(router, logger);
  privilegesCheckPrivilegeMonitoringRoute(router, logger, getStartServices);
  searchPrivilegeMonitoringIndicesRoute(router, logger);
  createPrivilegeMonitoringIndicesRoute(router, logger);
  createUserRoute(router, logger);
  deleteUserRoute(router, logger);
  listUsersRoute(router, logger);
  updateUserRoute(router, logger);
  uploadUsersCSVRoute(router, logger, config);
  disablePrivilegeMonitoringEngineRoute(router, logger);
  registerMonitoringEntitySourceRoutes(router, logger, config);
};
