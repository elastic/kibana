/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';
import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { SiemMigrationItemSort } from '../../common/data/siem_migrations_data_item_client';
import { SiemMigrationsDataItemClient } from '../../common/data/siem_migrations_data_item_client';

export class DashboardMigrationsDataDashboardsClient extends SiemMigrationsDataItemClient<DashboardMigrationDashboard> {
  protected type = 'dashboard' as const;

  protected getFilterQuery(migrationId: string, _filters?: object): QueryDslQueryContainer {
    const filter: QueryDslQueryContainer[] = [{ term: { migration_id: migrationId } }];
    return { bool: { filter } };
  }

  protected getSortOptions(sort: SiemMigrationItemSort = {}): estypes.Sort {
    return [];
  }
}
