/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ConfigType } from '../../../../config';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { registerSiemWorkflowMigrationsTranslateRoute } from './translate';
import { registerSiemWorkflowMigrationsCreateRoute } from './create';
import { registerSiemWorkflowMigrationsGetRoute } from './get';
import { registerSiemWorkflowMigrationsUpdateRoute } from './update';
import { registerSiemWorkflowMigrationsDeleteRoute } from './delete';
import { registerSiemWorkflowMigrationsCreateWorkflowsRoute } from './workflows/create';
import { registerSiemWorkflowMigrationsGetWorkflowsRoute } from './workflows/get';
import { registerSiemWorkflowMigrationsStartRoute } from './start';
import { registerSiemWorkflowMigrationsStopRoute } from './stop';
import { registerSiemWorkflowMigrationsStatsRoute } from './stats';
import { registerSiemWorkflowMigrationsStatsAllRoute } from './stats_all';

export const registerSiemWorkflowMigrationsRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger
) => {
  if (config.experimentalFeatures.tinesWorkflowsMigration) {
    registerSiemWorkflowMigrationsTranslateRoute(router, logger);

    registerSiemWorkflowMigrationsCreateRoute(router, logger);
    registerSiemWorkflowMigrationsGetRoute(router, logger);
    registerSiemWorkflowMigrationsUpdateRoute(router, logger);
    registerSiemWorkflowMigrationsDeleteRoute(router, logger);

    registerSiemWorkflowMigrationsCreateWorkflowsRoute(router, logger);
    registerSiemWorkflowMigrationsGetWorkflowsRoute(router, logger);

    registerSiemWorkflowMigrationsStatsRoute(router, logger);
    registerSiemWorkflowMigrationsStatsAllRoute(router, logger);

    registerSiemWorkflowMigrationsStartRoute(router, logger);
    registerSiemWorkflowMigrationsStopRoute(router, logger);
  }
};
