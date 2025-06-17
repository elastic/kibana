/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { entityAnalyticsRunMigrationsRoute } from './run_migrations';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const registerMigrationsRoutes = ({
  router,
  logger,
  config,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  entityAnalyticsRunMigrationsRoute(router, logger, getStartServices);
};
