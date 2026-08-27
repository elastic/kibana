/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

import type { ConfigType } from '../../config';
import type { SecuritySolutionPluginRouter } from '../../types';
import { detonateAiSummaryRoute } from './routes/ai_summary';

/**
 * Detonate ships dark. Registration is skipped entirely when the flag is off, so the API paths
 * genuinely 404 rather than merely returning an error.
 */
export const registerDetonateRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger
): void => {
  if (!config.experimentalFeatures.detonateEnabled) {
    return;
  }

  detonateAiSummaryRoute(router, logger);
};
