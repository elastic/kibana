/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import type { DashboardMigration } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { SiemMigrationsDataBaseClient } from '../../common/data/siem_migrations_data_base_client';
import { isNotFoundError } from '../../common/utils/is_not_found_error';

export class DashboardMigrationsDataMigrationClient extends SiemMigrationsDataBaseClient {
  async create(name: string): Promise<string> {
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
          name,
        },
      })
      .catch((error) => {
        this.logger.error(`Error creating migration ${migrationId}: ${error}`);
        throw error;
      });

    return migrationId;
  }

  /** Gets the migration document by id or returns undefined if it does not exist. */
  async get(id: string): Promise<DashboardMigration | undefined> {
    const index = await this.getIndexName();
    return this.esClient
      .get<DashboardMigration>({ index, id })
      .then(this.processHit)
      .catch((error) => {
        if (isNotFoundError(error)) {
          return undefined;
        }
        this.logger.error(`Error getting migration ${id}: ${error}`);
        throw error;
      });
  }
}
