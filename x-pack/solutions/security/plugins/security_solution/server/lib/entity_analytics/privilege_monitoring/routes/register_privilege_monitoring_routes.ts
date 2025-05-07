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

import { padPrecheckAndInstallRoute } from './pad_precheck_and_install';
import { padRemoveInstallationRoute } from './pad_remove_installation';

export const registerPrivilegeMonitoringRoutes = ({
  router,
  logger,
  getStartServices,
  config,
}: EntityAnalyticsRoutesDeps) => {
  initPrivilegeMonitoringEngineRoute(router, logger, config);
  healthCheckPrivilegeMonitoringRoute(router, logger, config);
  padPrecheckAndInstallRoute(router, logger, config);
  padRemoveInstallationRoute(router, logger, config);
  searchPrivilegeMonitoringIndicesRoute(router, logger, config);
};
