/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AuthenticatedUser, IScopedClusterClient } from '@kbn/core/server';
import type {
  WorkflowMigration,
  WorkflowMigrationWorkflow,
} from '../../../../../common/siem_migrations/workflows/types';
import { SiemMigrationsDataMigrationClient } from '../../common/data/siem_migrations_data_migration_client';
import { WorkflowMigrationsDataWorkflowsClient } from './workflow_migrations_data_workflows_client';
import type { WorkflowMigrationIndexNameProviders } from '../types';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import { SiemMigrationsDataClient } from '../../common/data/siem_migrations_data_client';
import { SiemMigrationsDataResourcesClient } from '../../common/data/siem_migrations_data_resources_client';

/**
 * Data client facade for workflow migrations.
 * Resources index is included for base-class delete compatibility; no resource APIs in this POC.
 */
export class WorkflowMigrationsDataClient extends SiemMigrationsDataClient<
  WorkflowMigration,
  WorkflowMigrationWorkflow
> {
  public readonly migrations: SiemMigrationsDataMigrationClient<WorkflowMigration>;
  public readonly items: WorkflowMigrationsDataWorkflowsClient;
  public readonly resources: SiemMigrationsDataResourcesClient;

  constructor(
    indexNameProviders: WorkflowMigrationIndexNameProviders,
    currentUser: AuthenticatedUser,
    esScopedClient: IScopedClusterClient,
    logger: Logger,
    _spaceId: string,
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
    this.resources = new SiemMigrationsDataResourcesClient(
      indexNameProviders.resources,
      currentUser,
      esScopedClient,
      logger,
      dependencies
    );
  }
}
