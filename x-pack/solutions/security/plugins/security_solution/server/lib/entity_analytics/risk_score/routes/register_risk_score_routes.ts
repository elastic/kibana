/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { riskScorePreviewRoute } from './preview';
import { riskEngineSettingsRoute } from './settings';
import { riskEnginePrivilegesRoute } from './privileges';
import { riskEngineConfigureSavedObjectRoute } from './configure_saved_object';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const registerRiskScoreRoutes = ({
  router,
  logger,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  riskScorePreviewRoute(router, logger);
  riskEngineSettingsRoute(router, logger);
  riskEnginePrivilegesRoute(router, getStartServices);
  riskEngineConfigureSavedObjectRoute(router, getStartServices, logger);
};
