/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { StoredSiemMigration } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';

export class RuleMigrationsDataMigrationClient extends RuleMigrationsDataBaseClient {
  async create(): Promise<string> {
    const migrationId = uuidV4();
    const index = await this.getIndexName();
    const profileUid = await this.getProfileUid();
    const createdAt = new Date().toISOString();

    await this.esClient
      .index({
        refresh: 'wait_for',
        id: migrationId,
        index,
        document: {
          created_by: profileUid,
          created_at: createdAt,
        },
        op_type: 'create',
      })
      .catch((error) => {
        if (error.statusCode === 409) {
          const msg = `Migration ${migrationId} already exists.`;
          this.logger.error(msg);
          throw new Error(msg);
        }
        this.logger.error(`Error creating migration ${migrationId}: ${error}`);
        throw error;
      });

    return migrationId;
  }

  async get({ id }: { id: string }): Promise<StoredSiemMigration> {
    this.logger.debug(`Getting migration ${id}.`);
    const index = await this.getIndexName();
    const response = await this.esClient
      .get<StoredSiemMigration>({
        index,
        id,
        _source: true,
      })
      .catch((error) => {
        this.logger.error(`Error getting migration ${id}: ${error}`);
        throw error;
      });

    if (!response._source) {
      throw new Error(
        `Migration document ${id} has no source. This is an unknown error. Please create a new migration.`
      );
    }

    return {
      ...response._source,
      id: response._id,
    };
  }
}
