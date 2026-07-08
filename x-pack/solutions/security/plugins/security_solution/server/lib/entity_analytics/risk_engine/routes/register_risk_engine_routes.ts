/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { riskEngineInitRoute } from './init';
import { riskEngineDisableRoute } from './disable';
import { riskEnginePrivilegesRoute } from './privileges';
import { riskEngineSettingsRoute } from './settings';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { riskEngineCleanupRoute } from './delete';
import { riskEngineConfigureSavedObjectRoute } from './configure_saved_object';

export const registerRiskEngineRoutes = ({
  router,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  riskEngineInitRoute(router, getStartServices);
  riskEngineDisableRoute(router, getStartServices);
  riskEngineSettingsRoute(router);
  riskEnginePrivilegesRoute(router, getStartServices);
  riskEngineCleanupRoute(router, getStartServices);
  riskEngineConfigureSavedObjectRoute(router, getStartServices);
};
