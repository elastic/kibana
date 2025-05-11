/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { BulkOperationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { StoredSiemMigration } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';
import { isNotFoundError } from './utils';

export class RuleMigrationsDataMigrationClient extends RuleMigrationsDataBaseClient {
  async create(): Promise<string> {
    const migrationId = uuidV4();
    const index = await this.getIndexName();
    const profileUid = await this.getProfileUid();
    const createdAt = new Date().toISOString();

    await this.esClient
      .create({
        refresh: 'wait_for',
        id: migrationId,
        index,
        document: {
          created_by: profileUid,
          created_at: createdAt,
        },
      })
      .catch((error) => {
        this.logger.error(`Error creating migration ${migrationId}: ${error}`);
        throw error;
      });

    return migrationId;
  }

  /**
   *
   * Gets the migration document by id or returns undefined if it does not exist.
   *
   * */
  async get({ id }: { id: string }): Promise<StoredSiemMigration | undefined> {
    const index = await this.getIndexName();
    return this.esClient
      .get<StoredSiemMigration>({
        index,
        id,
      })
      .then(this.processHit)
      .catch((error) => {
        if (isNotFoundError(error)) {
          return undefined;
        }
        this.logger.error(`Error getting migration ${id}: ${error}`);
        throw error;
      });
  }

  /**
   *
   * Prepares bulk ES delete operation for a migration document based on its id.
   *
   */
  async prepareDelete({ id }: { id: string }): Promise<BulkOperationContainer[]> {
    const index = await this.getIndexName();
    const migrationDeleteOperation = {
      delete: {
        _index: index,
        _id: id,
      },
    };

    return [migrationDeleteOperation];
  }
}
