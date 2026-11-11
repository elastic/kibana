/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AuthenticatedUser, IScopedClusterClient } from '@kbn/core/server';
import type { WorkflowMigration } from '../../../../../common/siem_migrations/model/workflow_migration.gen';
import { SiemMigrationsDataClient } from '../../common/data/siem_migrations_data_client';
import { SiemMigrationsDataMigrationClient } from '../../common/data/siem_migrations_data_migration_client';
import type { SiemMigrationsDataResourcesClient } from '../../common/data/siem_migrations_data_resources_client';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import type { WorkflowMigrationIndexNameProviders } from '../types';
import { WorkflowMigrationsDataWorkflowsClient } from './workflow_migrations_data_workflows_client';

export class WorkflowMigrationsDataClient extends SiemMigrationsDataClient<WorkflowMigration> {
  public readonly migrations: SiemMigrationsDataMigrationClient<WorkflowMigration>;
  public readonly items: WorkflowMigrationsDataWorkflowsClient;
  public readonly resources?: SiemMigrationsDataResourcesClient;

  constructor(
    indexNameProviders: WorkflowMigrationIndexNameProviders,
    currentUser: AuthenticatedUser,
    esScopedClient: IScopedClusterClient,
    logger: Logger,
    dependencies: SiemMigrationsClientDependencies
  ) {
    super(esScopedClient, logger);

    this.migrations = new SiemMigrationsDataMigrationClient<WorkflowMigration>(
      indexNameProviders.migrations,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
    this.items = new WorkflowMigrationsDataWorkflowsClient(
      indexNameProviders.workflows,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
  }
}
