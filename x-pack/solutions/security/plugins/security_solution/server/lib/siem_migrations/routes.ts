/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { registerSiemRuleMigrationsRoutes } from './rules/api';
import type { SecuritySolutionPluginRouter } from '../../types';
import type { ConfigType } from '../../config';

export const registerSiemMigrationsRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger
) => {
  if (!config.experimentalFeatures.siemMigrationsDisabled) {
    registerSiemRuleMigrationsRoutes(router, config, logger);
  }

  if (config.experimentalFeatures.automaticDashboardsMigration) {
    logger.warn(`\n\n\n \t\t WARNING: Automatic Dashboard Migrations are enabled. \n\n\n`);
    import('./dashboards/api').then(({ registerSiemDashboardMigrationsRoutes }) => {
      registerSiemDashboardMigrationsRoutes(router, logger);
    });
  }
};
