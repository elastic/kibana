/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { riskEnginePrivilegesRoute } from './privileges';
import { riskEngineSettingsRoute } from './settings';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { riskEngineConfigureSavedObjectRoute } from './configure_saved_object';
import { riskEngineCleanupRoute } from './delete';

export const registerRiskEngineRoutes = ({
  router,
  logger,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  riskEngineSettingsRoute(router, logger);
  riskEnginePrivilegesRoute(router, getStartServices);
  riskEngineConfigureSavedObjectRoute(router, logger, getStartServices);
  riskEngineCleanupRoute(router, getStartServices);
};
