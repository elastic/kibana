/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import { SiemMigrationsDataBaseClient } from '../../common/data/rule_migrations_data_base_client';
import type { RawDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';

/* BULK_MAX_SIZE defines the number to break down the bulk operations by.
 * The 500 number was chosen as a reasonable number to avoid large payloads. It can be adjusted if needed. */
const BULK_MAX_SIZE = 500 as const;

export class DashboardMigrationsDataDashboardsClient extends SiemMigrationsDataBaseClient {
  /** Indexes an array of rule migrations to be processed */
  async create(migrationId: string, rawDashboards: RawDashboard[]): Promise<void> {
    const index = await this.getIndexName();
    const profileId = await this.getProfileUid();

    let rawDashboardMaxBatch: RawDashboard[];
    const createdAt = new Date().toISOString();
    while ((rawDashboardMaxBatch = rawDashboards.splice(0, BULK_MAX_SIZE)).length) {
      await this.esClient
        .bulk({
          refresh: 'wait_for',
          operations: rawDashboardMaxBatch.flatMap((rawDashboard) => [
            { create: { _index: index } },
            {
              migration_id: migrationId,
              raw: rawDashboard,
              '@timestamp': createdAt,
              status: SiemMigrationStatus.PENDING,
              created_by: profileId,
              updated_by: profileId,
              updated_at: createdAt,
            },
          ]),
        })
        .catch((error) => {
          this.logger.error(
            `Error adding dashboards to migration (id:${migrationId}) : ${error.message}`
          );
          throw error;
        });
    }
  }
}
