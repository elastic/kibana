/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { riskEngineInitRoute } from './init';
import { riskEngineEnableRoute } from './enable';
import { riskEngineDisableRoute } from './disable';
import { riskEngineStatusRoute } from './status';
import { riskEnginePrivilegesRoute } from './privileges';
import { riskEngineSettingsRoute } from './settings';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import { riskEngineScheduleNowRoute } from './schedule_now';
import { riskEngineCleanupRoute } from './delete';
import { riskEngineConfigureSavedObjectRoute } from './configure_saved_object';

export const registerRiskEngineRoutes = ({
  router,
  getStartServices,
  config,
}: EntityAnalyticsRoutesDeps) => {
  const isRiskScoringMaintainerEnabled = config.experimentalFeatures.entityAnalyticsEntityStoreV2;

  riskEngineStatusRoute(router, getStartServices, isRiskScoringMaintainerEnabled);
  riskEngineInitRoute(router, getStartServices, isRiskScoringMaintainerEnabled);
  riskEngineEnableRoute(router, getStartServices, isRiskScoringMaintainerEnabled);
  riskEngineDisableRoute(router, getStartServices, isRiskScoringMaintainerEnabled);
  riskEngineScheduleNowRoute(router, getStartServices, isRiskScoringMaintainerEnabled);
  riskEngineSettingsRoute(router);
  riskEnginePrivilegesRoute(router, getStartServices);
  riskEngineCleanupRoute(router, getStartServices, isRiskScoringMaintainerEnabled);
  riskEngineConfigureSavedObjectRoute(router, getStartServices);
};
