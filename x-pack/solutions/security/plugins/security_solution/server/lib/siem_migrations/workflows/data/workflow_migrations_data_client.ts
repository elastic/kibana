/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { AuthenticatedUser, IScopedClusterClient } from '@kbn/core/server';
import type { WorkflowMigration } from '../../../../../common/siem_migrations/workflows/types';
import { SiemMigrationsDataMigrationClient } from '../../common/data/siem_migrations_data_migration_client';
import { WorkflowMigrationsDataWorkflowsClient } from './workflow_migrations_data_workflows_client';
import type { WorkflowMigrationIndexNameProviders } from '../types';
import type { SiemMigrationsClientDependencies } from '../../common/types';

export class WorkflowMigrationsDataClient {
  public readonly migrations: SiemMigrationsDataMigrationClient<WorkflowMigration>;
  public readonly items: WorkflowMigrationsDataWorkflowsClient;
  private readonly esClient: IScopedClusterClient['asInternalUser'];

  constructor(
    indexNameProviders: WorkflowMigrationIndexNameProviders,
    currentUser: AuthenticatedUser,
    esScopedClient: IScopedClusterClient,
    private readonly logger: Logger,
    dependencies: SiemMigrationsClientDependencies
  ) {
    this.esClient = esScopedClient.asInternalUser;
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

  /** Deletes a migration and its stored workflows. */
  public async deleteMigration(migrationId: string): Promise<void> {
    const [migrationDeleteOperations, migrationItemsDeleteOperations] = await Promise.all([
      this.migrations.prepareDelete(migrationId),
      this.items.prepareDelete(migrationId),
    ]);

    await this.esClient
      .bulk({
        refresh: 'wait_for',
        operations: [...migrationDeleteOperations, ...migrationItemsDeleteOperations],
      })
      .catch((error) => {
        this.logger.error(`Error deleting workflow migration ${migrationId}: ${error}`);
        throw error;
      });
  }
}
