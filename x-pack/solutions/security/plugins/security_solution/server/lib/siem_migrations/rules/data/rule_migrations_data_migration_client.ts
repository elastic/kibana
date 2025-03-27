/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateMigrationMetadataInput, StoredMigrationMetadata } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';

export class RuleMigrationsDataMigrationClient extends RuleMigrationsDataBaseClient {
  async create({ migrationId }: CreateMigrationMetadataInput): Promise<void> {
    const index = await this.getIndexName();
    const profileUid = await this.getProfileUid();

    const createdAt = new Date().toISOString();

    // check if migration already exists
    const migration = await this.get({ migrationId });

    this.logger.warn(JSON.stringify(migration));

    if (migration?.migration_id === migrationId) {
      // no-op if migration already exists
      return;
    }

    await this.esClient
      .bulk({
        refresh: 'wait_for',
        operations: [
          { create: { _index: index } },
          {
            migration_id: migrationId,
            created_by: profileUid,
            created_at: createdAt,
            updated_at: createdAt,
            updated_by: profileUid,
          },
        ],
      })
      .catch((error) => {
        this.logger.error(`Error creating migration ${migrationId}: ${error}`);
        throw error;
      });
  }

  async get({ migrationId }: { migrationId: string }): Promise<StoredMigrationMetadata> {
    this.logger.debug(`Getting migration ${migrationId}.`);
    const index = await this.getIndexName();
    const queryByMigrationId = {
      term: {
        migration_id: migrationId,
      },
    };
    const response = await this.esClient
      .search<StoredMigrationMetadata>({
        index,
        query: queryByMigrationId,
        size: 1,
      })
      .catch((error) => {
        this.logger.error(`Error getting migration ${migrationId}: ${error}`);
        throw error;
      });

    return this.processResponseHits(response)[0];
  }
}
