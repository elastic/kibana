/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { entityAnalyticsRunMigrationsRoute } from './run_migrations';
import { assetCriticalityLibraryMigrationRoute } from '../../asset_criticality/migration_poc/run_library_migration_route';
import type { EntityAnalyticsRoutesDeps } from '../../types';

export const registerMigrationsRoutes = ({
  router,
  logger,
  config,
  getStartServices,
  hasEncryptionKey,
}: EntityAnalyticsRoutesDeps) => {
  entityAnalyticsRunMigrationsRoute(router, logger, getStartServices, config, hasEncryptionKey);
  // Proof of concept, invoked by hand alongside the route above to compare the two.
  assetCriticalityLibraryMigrationRoute(router, logger);
};
