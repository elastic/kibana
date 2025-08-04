/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AuthenticatedUser, IScopedClusterClient } from '@kbn/core/server';
import { DashboardMigrationsDataDashboardsClient } from './dashboard_migrations_dashboards_client';
import { DashboardMigrationsDataMigrationClient } from './dashboard_migrations_migration_client';
import type { DashboardMigrationIndexNameProviders } from '../types';
import type { SiemMigrationsClientDependencies } from '../../common/types';

export class DashboardMigrationsDataClient {
  public readonly migrations: DashboardMigrationsDataMigrationClient;
  public readonly dashboards: DashboardMigrationsDataDashboardsClient;

  constructor(
    indexNameProviders: DashboardMigrationIndexNameProviders,
    currentUser: AuthenticatedUser,
    esScopedClient: IScopedClusterClient,
    logger: Logger,
    spaceId: string,
    dependencies: SiemMigrationsClientDependencies
  ) {
    this.migrations = new DashboardMigrationsDataMigrationClient(
      indexNameProviders.migrations,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
    this.dashboards = new DashboardMigrationsDataDashboardsClient(
      indexNameProviders.dashboards,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
  }
}
