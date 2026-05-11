/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConfigType } from '../../../config';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { runEmulationCommandRoute } from './run_command/route';

export const registerDetectionEmulationRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger
) => {
  runEmulationCommandRoute(router, config, logger);
};
