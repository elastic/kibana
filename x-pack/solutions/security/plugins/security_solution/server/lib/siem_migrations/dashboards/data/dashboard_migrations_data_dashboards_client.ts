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
} from '@elastic/elasticsearch/lib/api/types';
import type {
  DashboardMigrationDashboard,
  DashboardMigrationTranslationStats,
} from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { SiemMigrationItemSort } from '../../common/data/siem_migrations_data_item_client';
import { SiemMigrationsDataItemClient } from '../../common/data/siem_migrations_data_item_client';
import { dsl } from '../../common/data/dsl_queries';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';

export class DashboardMigrationsDataDashboardsClient extends SiemMigrationsDataItemClient<DashboardMigrationDashboard> {
  protected type = 'dashboard' as const;

  protected getSortOptions(sort: SiemMigrationItemSort = {}): estypes.Sort {
    // TODO: implement sorting logic similar to getSortOptions in the rules client
    return [];
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
          installable: { filter: { bool: { must: dsl.isInstallable() } } },
          missing_index: { filter: dsl.isMissingIndex() },
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
      items: {
        total,
        success: {
          total: (successAgg as AggregationsFilterAggregate)?.doc_count ?? 0,
          result: this.translationResultAggCount(translationResultsAgg),
          installable: (successAgg.installable as AggregationsFilterAggregate)?.doc_count ?? 0,
          missing_index: (successAgg.missing_index as AggregationsFilterAggregate)?.doc_count ?? 0,
        },
        failed: (aggs.failed as AggregationsFilterAggregate)?.doc_count ?? 0,
      },
    };
  }
}
