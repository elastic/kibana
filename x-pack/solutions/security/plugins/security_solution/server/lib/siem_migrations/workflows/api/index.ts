/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ConfigType } from '../../../../config';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { registerSiemWorkflowMigrationsCreateRoute } from './create';
import { registerSiemWorkflowMigrationsDeleteRoute } from './delete';
import { registerSiemWorkflowMigrationsGetRoute } from './get';
import { registerSiemWorkflowMigrationsStartRoute } from './start';
import { registerSiemWorkflowMigrationsStatsRoute } from './stats';
import { registerSiemWorkflowMigrationsStatsAllRoute } from './stats_all';
import { registerSiemWorkflowMigrationsStopRoute } from './stop';
import { registerSiemWorkflowMigrationsTranslationStatsRoute } from './translation_stats';
import { registerSiemWorkflowMigrationsUpdateRoute } from './update';
import { registerSiemWorkflowMigrationsCreateWorkflowsRoute } from './workflows/create';
import { registerSiemWorkflowMigrationsGetWorkflowsRoute } from './workflows/get';
import { registerSiemWorkflowMigrationsUpdateWorkflowsRoute } from './workflows/update';

/**
 * Workflow migration routes follow the SIEM rule migration API.
 * Handlers are placeholders until they are wired to the data service.
 */
export const registerSiemWorkflowMigrationsRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger
) => {
  if (!config.experimentalFeatures.tinesWorkflowsMigration) {
    return;
  }

  /** Workflow migrations */
  registerSiemWorkflowMigrationsCreateRoute(router, logger);
  registerSiemWorkflowMigrationsGetRoute(router, logger);
  registerSiemWorkflowMigrationsDeleteRoute(router, logger);
  registerSiemWorkflowMigrationsUpdateRoute(router, logger);

  /** Workflows */
  registerSiemWorkflowMigrationsCreateWorkflowsRoute(router, logger);
  registerSiemWorkflowMigrationsGetWorkflowsRoute(router, logger);
  registerSiemWorkflowMigrationsUpdateWorkflowsRoute(router, logger);

  /** Tasks */
  registerSiemWorkflowMigrationsStatsAllRoute(router, logger);
  registerSiemWorkflowMigrationsStartRoute(router, logger);
  registerSiemWorkflowMigrationsStatsRoute(router, logger);
  registerSiemWorkflowMigrationsTranslationStatsRoute(router, logger);
  registerSiemWorkflowMigrationsStopRoute(router, logger);
};
