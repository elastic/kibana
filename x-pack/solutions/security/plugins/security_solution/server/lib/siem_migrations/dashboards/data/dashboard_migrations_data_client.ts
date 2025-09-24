/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AuthenticatedUser, IScopedClusterClient } from '@kbn/core/server';
import type { DashboardMigration } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { SiemMigrationsDataMigrationClient } from '../../common/data/siem_migrations_data_migration_client';
import { DashboardMigrationsDataDashboardsClient } from './dashboard_migrations_data_dashboards_client';
import type { DashboardMigrationIndexNameProviders } from '../types';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { SiemMigrationsDataClient } from '../../common/data/siem_migrations_data_client';
import { SiemMigrationsDataResourcesClient } from '../../common/data/siem_migrations_data_resources_client';
import { SiemMigrationsDataLookupsClient } from '../../common/data/siem_migrations_data_lookups_client';

export class DashboardMigrationsDataClient extends SiemMigrationsDataClient {
  public readonly migrations: SiemMigrationsDataMigrationClient<DashboardMigration>;
  public readonly items: DashboardMigrationsDataDashboardsClient;
  public readonly resources: SiemMigrationsDataResourcesClient;
  public readonly lookups: SiemMigrationsDataLookupsClient;

  constructor(
    indexNameProviders: DashboardMigrationIndexNameProviders,
    currentUser: AuthenticatedUser,
    esScopedClient: IScopedClusterClient,
    logger: Logger,
    spaceId: string,
    dependencies: SiemMigrationsClientDependencies
  ) {
    super(esScopedClient, logger);

    this.migrations = new SiemMigrationsDataMigrationClient<DashboardMigration>(
      indexNameProviders.migrations,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
    this.items = new DashboardMigrationsDataDashboardsClient(
      indexNameProviders.dashboards,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
    this.resources = new SiemMigrationsDataResourcesClient(
      indexNameProviders.resources,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
    this.lookups = new SiemMigrationsDataLookupsClient(
      currentUser,
      esScopedClient,
      logger,
      spaceId
    );
  }
}
