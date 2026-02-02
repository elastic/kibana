/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  AggregationsFilterAggregate,
  AggregationsStringTermsAggregate,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { SiemMigrationVendor } from '../../../../../common/siem_migrations/model/common.gen';
import type {
  DashboardMigrationDashboard,
  DashboardMigrationTranslationStats,
} from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { SiemMigrationsDataItemClient } from '../../common/data/siem_migrations_data_item_client';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import type { DashboardMigrationFilters } from '../../../../../common/siem_migrations/dashboards/types';
import type { SiemMigrationSort } from '../../common/data/types';
import { dsl } from './dsl_queries';
import { getSortingOptions } from './sort';

export class DashboardMigrationsDataDashboardsClient extends SiemMigrationsDataItemClient<DashboardMigrationDashboard> {
  protected type = 'dashboard' as const;

  protected getSortOptions(sort: SiemMigrationSort = {}): estypes.Sort {
    return getSortingOptions(sort);
  }

  public async getVendor(migrationId: string): Promise<SiemMigrationVendor | undefined> {
    const { data: dashboards } = await this.get(migrationId, { size: 1 });
    return dashboards.length > 0 ? dashboards[0].original_dashboard.vendor : undefined;
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
      filter.push(filters.installable ? dsl.isInstallable() : dsl.isNotInstallable());
    }

    return { bool: { filter } };
  }

  /** Retrieves the translation stats for the dashboard migrations with the provided id */
  public async getTranslationStats(
    migrationId: string
  ): Promise<DashboardMigrationTranslationStats> {
    const index = await this.getIndexName();
    const query = this.getFilterQuery(migrationId);
    const aggregations = {
      success: {
        filter: { term: { status: SiemMigrationStatus.COMPLETED } },
        aggs: {
          result: { terms: { field: 'translation_result' } },
          installable: { filter: dsl.isInstallable() },
        },
      },
      failed: { filter: { term: { status: SiemMigrationStatus.FAILED } } },
    };
    const result = await this.esClient
      .search({ index, query, aggregations, _source: false })
      .catch((error) => {
        this.logger.error(`Error getting dashboard migrations stats: ${error.message}`);
        throw error;
      });

    const aggs = result.aggregations ?? {};
    const total = this.getTotalHits(result);
    const successAgg = aggs.success as AggregationsFilterAggregate;
    const translationResultsAgg = successAgg.result as AggregationsStringTermsAggregate;
    return {
      id: migrationId,
      dashboards: {
        total,
        success: {
          total: (successAgg as AggregationsFilterAggregate)?.doc_count ?? 0,
          result: this.translationResultAggCount(translationResultsAgg),
          installable: (successAgg.installable as AggregationsFilterAggregate)?.doc_count ?? 0,
        },
        failed: (aggs.failed as AggregationsFilterAggregate)?.doc_count ?? 0,
      },
    };
  }
}
