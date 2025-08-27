/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { registerSiemDashboardMigrationsCreateRoute } from './create';
import { registerSiemDashboardMigrationsCreateDashboardsRoute } from './dashboards/create';
import { registerSiemDashboardMigrationsStatsRoute } from './stats';
import { registerSiemDashboardMigrationsGetRoute } from './get';
import { registerSiemDashboardMigrationsResourceGetMissingRoute } from './resources/missing';

export const registerSiemDashboardMigrationsRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  // ===== Dashboard Migrations ======
  registerSiemDashboardMigrationsCreateRoute(router, logger);
  registerSiemDashboardMigrationsGetRoute(router, logger);

  // ===== Stats ========
  registerSiemDashboardMigrationsStatsRoute(router, logger);

  // ===== Dashboards ======
  registerSiemDashboardMigrationsCreateDashboardsRoute(router, logger);

  // ===== Resources ======
  registerSiemDashboardMigrationsResourceGetMissingRoute(router, logger);
};
