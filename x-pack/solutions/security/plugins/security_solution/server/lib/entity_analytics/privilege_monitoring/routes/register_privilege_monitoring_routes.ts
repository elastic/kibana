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
  docLinks,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  padInstallRoute(router, logger, config);
  padGetStatusRoute(router, logger, config);
  initPrivilegeMonitoringEngineRoute(router, logger, config, docLinks);
  scheduleNowMonitoringEngineRoute(router, logger, config, docLinks);
  deletePrivilegeMonitoringEngineRoute(router, logger, config, docLinks);
  healthCheckPrivilegeMonitoringRoute(router, logger, config, docLinks);
  privilegesCheckPrivilegeMonitoringRoute(router, logger, getStartServices, config, docLinks);
  searchPrivilegeMonitoringIndicesRoute(router, logger, config, docLinks);
  createPrivilegeMonitoringIndicesRoute(router, logger, config, docLinks);
  createUserRoute(router, logger, config, docLinks);
  deleteUserRoute(router, logger, config, docLinks);
  listUsersRoute(router, logger, config, docLinks);
  updateUserRoute(router, logger, config, docLinks);
  uploadUsersCSVRoute(router, logger, config, docLinks);
  disablePrivilegeMonitoringEngineRoute(router, logger, config, docLinks);
  registerMonitoringEntitySourceRoutes(router, logger, config, docLinks);
};
