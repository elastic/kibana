/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import type { SiemMigrationsDataResourcesClient } from './siem_migrations_data_resources_client';
import type { SiemMigrationsDataItemClient } from './siem_migrations_data_item_client';
import type { ItemDocument, MigrationDocument } from '../types';
import type { SiemMigrationsDataMigrationClient } from './siem_migrations_data_migration_client';

export abstract class SiemMigrationsDataClient<
  M extends MigrationDocument = MigrationDocument,
  I extends ItemDocument = ItemDocument
> {
  // Data clients use the ES client `asInternalUser` by default.
  // We may want to use `asCurrentUser` instead in the future if the APIs are made public.
  protected readonly esClient: IScopedClusterClient['asInternalUser'];

  public abstract readonly migrations: SiemMigrationsDataMigrationClient<M>;
  public abstract readonly items: SiemMigrationsDataItemClient<I>;
  public abstract readonly resources: SiemMigrationsDataResourcesClient;

  constructor(
    public readonly esScopedClient: IScopedClusterClient,
    protected readonly logger: Logger
  ) {
    this.esClient = esScopedClient.asInternalUser;
  }

  /** Deletes a migration and all its associated items and resources. */
  public async deleteMigration(migrationId: string) {
    const [
      migrationDeleteOperations,
      migrationItemsDeleteOperations,
      migrationResourcesDeleteOperations,
    ] = await Promise.all([
      this.migrations.prepareDelete(migrationId),
      this.items.prepareDelete(migrationId),
      this.resources.prepareDelete(migrationId),
    ]);

    return this.esClient
      .bulk({
        refresh: 'wait_for',
        operations: [
          ...migrationDeleteOperations,
          ...migrationItemsDeleteOperations,
          ...migrationResourcesDeleteOperations,
        ],
      })
      .then(() => {
        this.logger.info(`Deleted migration ${migrationId}`);
      })
      .catch((error) => {
        this.logger.error(`Error deleting migration ${migrationId}: ${error}`);
        throw error;
      });
  }
}
