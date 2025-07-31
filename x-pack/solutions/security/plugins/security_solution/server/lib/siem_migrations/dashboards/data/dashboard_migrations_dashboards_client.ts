/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsMaxAggregate,
  AggregationsMinAggregate,
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { MigrationTaskStatusEnum } from '../../../../../common/siem_migrations/model/common.gen';
import type { SplunkOriginalDashboardExport } from '../../../../../common/siem_migrations/model/vendor/dashboards/splunk.gen';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import { SiemMigrationsDataBaseClient } from '../../common/data/siem_migrations_data_base_client';
import {
  type DashboardMigrationDashboard,
  type DashboardMigrationTaskStats,
} from '../../../../../common/siem_migrations/model/dashboard_migration.gen';

/* BULK_MAX_SIZE defines the number to break down the bulk operations by.
 * The 500 number was chosen as a reasonable number to avoid large payloads. It can be adjusted if needed. */
const BULK_MAX_SIZE = 500 as const;

export class DashboardMigrationsDataDashboardsClient extends SiemMigrationsDataBaseClient {
  /** Indexes an array of dashboards to be processed as a part of single migration */
  async create(
    migrationId: string,
    originalDashboards: SplunkOriginalDashboardExport[]
  ): Promise<void> {
    const index = await this.getIndexName();
    const profileId = await this.getProfileUid();

    let originalDashboardsMaxBatch: SplunkOriginalDashboardExport[];
    const createdAt = new Date().toISOString();
    while ((originalDashboardsMaxBatch = originalDashboards.splice(0, BULK_MAX_SIZE)).length) {
      await this.esClient
        .bulk<DashboardMigrationDashboard>({
          refresh: 'wait_for',
          operations: originalDashboardsMaxBatch.flatMap(({ result: { ...originalDashboard } }) => [
            { create: { _index: index } },
            {
              migration_id: migrationId,
              '@timestamp': createdAt,
              status: SiemMigrationStatus.PENDING,
              created_by: profileId,
              updated_by: profileId,
              updated_at: createdAt,
              original_dashboard: {
                id: originalDashboard.id,
                title: originalDashboard.label ?? originalDashboard.title,
                description: originalDashboard.description ?? '',
                data: originalDashboard?.['eai:data'],
                format: 'xml',
                vendor: 'splunk',
                last_updated: originalDashboard.updated,
                splunk_properties: {
                  app: originalDashboard['eai:acl.app'],
                  owner: originalDashboard['eai:acl.owner'],
                  sharing: originalDashboard['eai:acl.sharing'],
                },
              },
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

  async getStats(migrationId: string): Promise<Omit<DashboardMigrationTaskStats, 'name'>> {
    const index = await this.getIndexName();

    const migrationIdFilter: QueryDslQueryContainer = { term: { migration_id: migrationId } };
    const query = {
      bool: {
        filter: migrationIdFilter,
      },
    };
    const aggregations = {
      status: { terms: { field: 'status' } },
      createdAt: { min: { field: '@timestamp' } },
      lastUpdatedAt: { max: { field: 'updated_at' } },
    };
    const result = await this.esClient
      .search({ index, query, aggregations, _source: false })
      .catch((error) => {
        this.logger.error(`Error getting dashboard migration stats: ${error.message}`);
        throw error;
      });

    const aggs = result.aggregations ?? {};

    return {
      id: migrationId,
      dashboards: {
        total: this.getTotalHits(result),
        ...this.statusAggCounts(aggs.status as AggregationsStringTermsAggregate),
      },
      created_at: (aggs.createdAt as AggregationsMinAggregate)?.value_as_string ?? '',
      last_updated_at: (aggs.lastUpdatedAt as AggregationsMaxAggregate)?.value_as_string ?? '',
      status: MigrationTaskStatusEnum.ready,
    };
  }

  private statusAggCounts(
    statusAgg: AggregationsStringTermsAggregate
  ): Record<SiemMigrationStatus, number> {
    const buckets = statusAgg.buckets as AggregationsStringTermsBucket[];
    return {
      [SiemMigrationStatus.PENDING]:
        buckets.find(({ key }) => key === SiemMigrationStatus.PENDING)?.doc_count ?? 0,
      [SiemMigrationStatus.PROCESSING]:
        buckets.find(({ key }) => key === SiemMigrationStatus.PROCESSING)?.doc_count ?? 0,
      [SiemMigrationStatus.COMPLETED]:
        buckets.find(({ key }) => key === SiemMigrationStatus.COMPLETED)?.doc_count ?? 0,
      [SiemMigrationStatus.FAILED]:
        buckets.find(({ key }) => key === SiemMigrationStatus.FAILED)?.doc_count ?? 0,
    };
  }
}
