/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import type { ConfigType } from '../../../../config';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { registerSiemDashboardMigrationsCreateRoute } from './create';
import { registerSiemDashboardMigrationsCreateDashboardsRoute } from './dashboards/create';
import { registerSiemDashboardMigrationsStatsRoute } from './stats';
import { registerSiemDashboardMigrationsGetRoute } from './get';
import { registerSiemDashboardMigrationsStartRoute } from './start';
import { registerSiemDashboardMigrationsStopRoute } from './stop';
import { registerSiemDashboardMigrationsEvaluateRoute } from './evaluation/evaluate';
import { registerSiemDashboardMigrationsResourceGetMissingRoute } from './resources/missing';
import { registerSiemDashboardMigrationsGetDashboardsRoute } from './dashboards/get';
import { registerSiemDashboardMigrationsDeleteRoute } from './delete';

export const registerSiemDashboardMigrationsRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger
) => {
  // ===== Dashboard Migrations ======
  registerSiemDashboardMigrationsCreateRoute(router, logger);
  registerSiemDashboardMigrationsGetRoute(router, logger);
  registerSiemDashboardMigrationsDeleteRoute(router, logger);

  // ===== Dashboards ======
  registerSiemDashboardMigrationsCreateDashboardsRoute(router, logger);
  registerSiemDashboardMigrationsGetDashboardsRoute(router, logger);

  // ===== Resources ======
  registerSiemDashboardMigrationsResourceGetMissingRoute(router, logger);

  // ===== Stats ========
  registerSiemDashboardMigrationsStatsRoute(router, logger);

  // ===== Task ========
  registerSiemDashboardMigrationsStartRoute(router, logger);
  registerSiemDashboardMigrationsStopRoute(router, logger);
  if (config.experimentalFeatures.assistantModelEvaluation) {
    // Use the same experimental feature flag as the assistant model evaluation.
    // This route is not intended to be used by the end user, but rather for internal purposes.
    registerSiemDashboardMigrationsEvaluateRoute(router, logger);
  }
};
