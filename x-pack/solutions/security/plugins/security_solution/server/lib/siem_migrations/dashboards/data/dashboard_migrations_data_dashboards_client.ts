/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DashboardMigrationFilters } from '../../../../../common/siem_migrations/dashboards/types';
import type { DashboardMigrationDashboard } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { SiemMigrationsDataItemClient } from '../../common/data/siem_migrations_data_item_client';
import type { SiemMigrationSort } from '../../common/data/types';
import { dsl } from './dsl_queries';
import { getSortingOptions } from './sort';

export class DashboardMigrationsDataDashboardsClient extends SiemMigrationsDataItemClient<DashboardMigrationDashboard> {
  protected type = 'dashboard' as const;

  protected getSortOptions(sort: SiemMigrationSort = {}): estypes.Sort {
    return getSortingOptions(sort);
  }

  protected getFilterQuery(
    migrationId: string,
    filters: DashboardMigrationFilters = {}
  ): { bool: { filter: QueryDslQueryContainer[] } } {
    const { filter } = super.getFilterQuery(migrationId, filters).bool;

    if (filters.searchTerm?.length) {
      filter.push(dsl.matchTitle(filters.searchTerm));
    }

    if (filters.installed != null) {
      filter.push(filters.installed ? dsl.isInstalled() : dsl.isNotInstalled());
    }
    if (filters.installable != null) {
      filter.push(...(filters.installable ? dsl.isInstallable() : dsl.isNotInstallable()));
    }

    return { bool: { filter } };
  }
}
