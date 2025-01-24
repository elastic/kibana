/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsFilterAggregate,
  AggregationsMaxAggregate,
  AggregationsMinAggregate,
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
  QueryDslQueryContainer,
  Duration,
} from '@elastic/elasticsearch/lib/api/types';
import type { RuleMigrationFilters } from '../../../../../common/siem_migrations/types';
import type { InternalUpdateRuleMigrationData, StoredRuleMigration } from '../types';
import {
  SiemMigrationStatus,
  RuleTranslationResult,
} from '../../../../../common/siem_migrations/constants';
import {
  type RuleMigration,
  type RuleMigrationTaskStats,
  type RuleMigrationTranslationStats,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';
import { getSortingOptions, type RuleMigrationSort } from './sort';
import { conditions as searchConditions } from './search';

export type CreateRuleMigrationInput = Omit<
  RuleMigration,
  '@timestamp' | 'id' | 'status' | 'created_by'
>;
export type RuleMigrationDataStats = Omit<RuleMigrationTaskStats, 'status'>;
export type RuleMigrationAllDataStats = RuleMigrationDataStats[];

export interface RuleMigrationGetOptions {
  filters?: RuleMigrationFilters;
  sort?: RuleMigrationSort;
  from?: number;
  size?: number;
}

/* BULK_MAX_SIZE defines the number to break down the bulk operations by.
 * The 500 number was chosen as a reasonable number to avoid large payloads. It can be adjusted if needed. */
const BULK_MAX_SIZE = 500 as const;
/* DEFAULT_SEARCH_BATCH_SIZE defines the default number of documents to retrieve per search operation
 * when retrieving search results in batches. */
const DEFAULT_SEARCH_BATCH_SIZE = 500 as const;

export class RuleMigrationsDataRulesClient extends RuleMigrationsDataBaseClient {
  /** Indexes an array of rule migrations to be processed */
  async create(ruleMigrations: CreateRuleMigrationInput[]): Promise<void> {
    const index = await this.getIndexName();
    const profileId = await this.getProfileUid();

    let ruleMigrationsSlice: CreateRuleMigrationInput[];
    const createdAt = new Date().toISOString();
    while ((ruleMigrationsSlice = ruleMigrations.splice(0, BULK_MAX_SIZE)).length) {
      await this.esClient
        .bulk({
          refresh: 'wait_for',
          operations: ruleMigrationsSlice.flatMap((ruleMigration) => [
            { create: { _index: index } },
            {
              ...ruleMigration,
              '@timestamp': createdAt,
              status: SiemMigrationStatus.PENDING,
              created_by: profileId,
              updated_by: profileId,
              updated_at: createdAt,
            },
          ]),
        })
        .catch((error) => {
          this.logger.error(`Error creating rule migrations: ${error.message}`);
          throw error;
        });
    }
  }

  /** Updates an array of rule migrations to be processed */
  async update(ruleMigrations: InternalUpdateRuleMigrationData[]): Promise<void> {
    const index = await this.getIndexName();
    const profileId = await this.getProfileUid();

    let ruleMigrationsSlice: InternalUpdateRuleMigrationData[];
    const updatedAt = new Date().toISOString();
    while ((ruleMigrationsSlice = ruleMigrations.splice(0, BULK_MAX_SIZE)).length) {
      await this.esClient
        .bulk({
          refresh: 'wait_for',
          operations: ruleMigrationsSlice.flatMap((ruleMigration) => {
            const { id, ...rest } = ruleMigration;
            return [
              { update: { _index: index, _id: id } },
              {
                doc: {
                  ...rest,
                  updated_by: profileId,
                  updated_at: updatedAt,
                },
              },
            ];
          }),
        })
        .catch((error) => {
          this.logger.error(`Error updating rule migrations: ${error.message}`);
          throw error;
        });
    }
  }

  /** Retrieves an array of rule documents of a specific migrations */
  async get(
    migrationId: string,
    { filters = {}, sort: sortParam = {}, from, size }: RuleMigrationGetOptions = {}
  ): Promise<{ total: number; data: StoredRuleMigration[] }> {
    const index = await this.getIndexName();
    const query = this.getFilterQuery(migrationId, filters);
    const sort = sortParam.sortField ? getSortingOptions(sortParam) : undefined;

    const result = await this.esClient
      .search<RuleMigration>({ index, query, sort, from, size })
      .catch((error) => {
        this.logger.error(`Error searching rule migrations: ${error.message}`);
        throw error;
      });
    return {
      total: this.getTotalHits(result),
      data: this.processResponseHits(result),
    };
  }

  /** Returns batching functions to traverse all the migration rules search results */
  searchBatches(
    migrationId: string,
    options: { scroll?: Duration; size?: number; filters?: RuleMigrationFilters } = {}
  ) {
    const { size = DEFAULT_SEARCH_BATCH_SIZE, filters = {}, scroll } = options;
    const query = this.getFilterQuery(migrationId, filters);
    const search = { query, sort: '_doc', scroll, size }; // sort by _doc to ensure consistent order
    try {
      return this.getSearchBatches<RuleMigration>(search);
    } catch (error) {
      this.logger.error(`Error scrolling rule migrations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieves `pending` rule migrations with the provided id and updates their status to `processing`.
   * This operation is not atomic at migration level:
   * - Multiple tasks can process different migrations simultaneously.
   * - Multiple tasks should not process the same migration simultaneously.
   */
  async takePending(migrationId: string, size: number): Promise<StoredRuleMigration[]> {
    const index = await this.getIndexName();
    const profileId = await this.getProfileUid();
    const query = this.getFilterQuery(migrationId, { status: SiemMigrationStatus.PENDING });

    const storedRuleMigrations = await this.esClient
      .search<RuleMigration>({ index, query, sort: '_doc', size })
      .then((response) =>
        this.processResponseHits(response, { status: SiemMigrationStatus.PROCESSING })
      )
      .catch((error) => {
        this.logger.error(`Error searching rule migrations: ${error.message}`);
        throw error;
      });

    await this.esClient
      .bulk({
        refresh: 'wait_for',
        operations: storedRuleMigrations.flatMap(({ id, status }) => [
          { update: { _id: id, _index: index } },
          {
            doc: { status, updated_by: profileId, updated_at: new Date().toISOString() },
          },
        ]),
      })
      .catch((error) => {
        this.logger.error(
          `Error updating for rule migrations status to processing: ${error.message}`
        );
        throw error;
      });

    return storedRuleMigrations;
  }

  /** Updates one rule migration with the provided data and sets the status to `completed` */
  async saveCompleted({ id, ...ruleMigration }: StoredRuleMigration): Promise<void> {
    const index = await this.getIndexName();
    const profileId = await this.getProfileUid();
    const doc = {
      ...ruleMigration,
      status: SiemMigrationStatus.COMPLETED,
      updated_by: profileId,
      updated_at: new Date().toISOString(),
    };
    await this.esClient.update({ index, id, doc, refresh: 'wait_for' }).catch((error) => {
      this.logger.error(`Error updating rule migration status to completed: ${error.message}`);
      throw error;
    });
  }

  /** Updates one rule migration with the provided data and sets the status to `failed` */
  async saveError({ id, ...ruleMigration }: StoredRuleMigration): Promise<void> {
    const index = await this.getIndexName();
    const profileId = await this.getProfileUid();
    const doc = {
      ...ruleMigration,
      status: SiemMigrationStatus.FAILED,
      updated_by: profileId,
      updated_at: new Date().toISOString(),
    };
    await this.esClient.update({ index, id, doc, refresh: 'wait_for' }).catch((error) => {
      this.logger.error(`Error updating rule migration status to failed: ${error.message}`);
      throw error;
    });
  }

  /** Updates all the rule migration with the provided id with status `processing` back to `pending` */
  async releaseProcessing(migrationId: string): Promise<void> {
    return this.updateStatus(
      migrationId,
      { status: SiemMigrationStatus.PROCESSING },
      SiemMigrationStatus.PENDING
    );
  }

  /** Updates all the rule migration with the provided id and with status `statusToQuery` to `statusToUpdate` */
  async updateStatus(
    migrationId: string,
    filter: RuleMigrationFilters,
    statusToUpdate: SiemMigrationStatus,
    { refresh = false }: { refresh?: boolean } = {}
  ): Promise<void> {
    const index = await this.getIndexName();
    const query = this.getFilterQuery(migrationId, filter);
    const script = { source: `ctx._source['status'] = '${statusToUpdate}'` };
    await this.esClient.updateByQuery({ index, query, script, refresh }).catch((error) => {
      this.logger.error(`Error updating rule migrations status: ${error.message}`);
      throw error;
    });
  }

  /** Retrieves the translation stats for the rule migrations with the provided id */
  async getTranslationStats(migrationId: string): Promise<RuleMigrationTranslationStats> {
    const index = await this.getIndexName();
    const query = this.getFilterQuery(migrationId);

    const aggregations = {
      success: {
        filter: { term: { status: SiemMigrationStatus.COMPLETED } },
        aggs: {
          result: { terms: { field: 'translation_result' } },
          installable: { filter: { bool: { must: searchConditions.isInstallable() } } },
          prebuilt: { filter: searchConditions.isPrebuilt() },
        },
      },
      failed: { filter: { term: { status: SiemMigrationStatus.FAILED } } },
    };
    const result = await this.esClient
      .search({ index, query, aggregations, _source: false })
      .catch((error) => {
        this.logger.error(`Error getting rule migrations stats: ${error.message}`);
        throw error;
      });

    const aggs = result.aggregations ?? {};
    const total = this.getTotalHits(result);
    const successAgg = aggs.success as AggregationsFilterAggregate;
    const translationResultsAgg = successAgg.result as AggregationsStringTermsAggregate;

    return {
      id: migrationId,
      rules: {
        total,
        success: {
          total: (successAgg as AggregationsFilterAggregate)?.doc_count ?? 0,
          result: this.translationResultAggCount(translationResultsAgg),
          installable: (successAgg.installable as AggregationsFilterAggregate)?.doc_count ?? 0,
          prebuilt: (successAgg.prebuilt as AggregationsFilterAggregate)?.doc_count ?? 0,
        },
        failed: (aggs.failed as AggregationsFilterAggregate)?.doc_count ?? 0,
      },
    };
  }

  /** Retrieves the stats for the rule migrations with the provided id */
  async getStats(migrationId: string): Promise<RuleMigrationDataStats> {
    const index = await this.getIndexName();
    const query = this.getFilterQuery(migrationId);
    const aggregations = {
      status: { terms: { field: 'status' } },
      createdAt: { min: { field: '@timestamp' } },
      lastUpdatedAt: { max: { field: 'updated_at' } },
    };
    const result = await this.esClient
      .search({ index, query, aggregations, _source: false })
      .catch((error) => {
        this.logger.error(`Error getting rule migrations stats: ${error.message}`);
        throw error;
      });

    const aggs = result.aggregations ?? {};

    return {
      id: migrationId,
      rules: {
        total: this.getTotalHits(result),
        ...this.statusAggCounts(aggs.status as AggregationsStringTermsAggregate),
      },
      created_at: (aggs.createdAt as AggregationsMinAggregate)?.value_as_string ?? '',
      last_updated_at: (aggs.lastUpdatedAt as AggregationsMaxAggregate)?.value_as_string ?? '',
    };
  }

  /** Retrieves the stats for all the rule migrations aggregated by migration id, in creation order */
  async getAllStats(): Promise<RuleMigrationAllDataStats> {
    const index = await this.getIndexName();
    const aggregations: { migrationIds: AggregationsAggregationContainer } = {
      migrationIds: {
        terms: { field: 'migration_id', order: { createdAt: 'asc' }, size: 10000 },
        aggregations: {
          status: { terms: { field: 'status' } },
          createdAt: { min: { field: '@timestamp' } },
          lastUpdatedAt: { max: { field: 'updated_at' } },
        },
      },
    };
    const result = await this.esClient
      .search({ index, aggregations, _source: false })
      .catch((error) => {
        this.logger.error(`Error getting all rule migrations stats: ${error.message}`);
        throw error;
      });

    const migrationsAgg = result.aggregations?.migrationIds as AggregationsStringTermsAggregate;
    const buckets = (migrationsAgg?.buckets as AggregationsStringTermsBucket[]) ?? [];
    return buckets.map((bucket) => ({
      id: bucket.key,
      rules: {
        total: bucket.doc_count,
        ...this.statusAggCounts(bucket.status),
      },
      created_at: bucket.createdAt?.value_as_string,
      last_updated_at: bucket.lastUpdatedAt?.value_as_string,
    }));
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

  private translationResultAggCount(
    resultAgg: AggregationsStringTermsAggregate
  ): Record<RuleTranslationResult, number> {
    const buckets = resultAgg.buckets as AggregationsStringTermsBucket[];
    return {
      [RuleTranslationResult.FULL]:
        buckets.find(({ key }) => key === RuleTranslationResult.FULL)?.doc_count ?? 0,
      [RuleTranslationResult.PARTIAL]:
        buckets.find(({ key }) => key === RuleTranslationResult.PARTIAL)?.doc_count ?? 0,
      [RuleTranslationResult.UNTRANSLATABLE]:
        buckets.find(({ key }) => key === RuleTranslationResult.UNTRANSLATABLE)?.doc_count ?? 0,
    };
  }

  private getFilterQuery(
    migrationId: string,
    filters: RuleMigrationFilters = {}
  ): QueryDslQueryContainer {
    const filter: QueryDslQueryContainer[] = [{ term: { migration_id: migrationId } }];
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        filter.push({ terms: { status: filters.status } });
      } else {
        filter.push({ term: { status: filters.status } });
      }
    }
    if (filters.ids) {
      filter.push({ terms: { _id: filters.ids } });
    }
    if (filters.searchTerm?.length) {
      filter.push(searchConditions.matchTitle(filters.searchTerm));
    }
    if (filters.installed === true) {
      filter.push(searchConditions.isInstalled());
    } else if (filters.installed === false) {
      filter.push(searchConditions.isNotInstalled());
    }
    if (filters.installable === true) {
      filter.push(...searchConditions.isInstallable());
    } else if (filters.installable === false) {
      filter.push(...searchConditions.isNotInstallable());
    }
    if (filters.prebuilt === true) {
      filter.push(searchConditions.isPrebuilt());
    } else if (filters.prebuilt === false) {
      filter.push(searchConditions.isCustom());
    }
    if (filters.failed === true) {
      filter.push(searchConditions.isFailed());
    } else if (filters.failed === false) {
      filter.push(searchConditions.isNotFailed());
    }
    if (filters.fullyTranslated === true) {
      filter.push(searchConditions.isFullyTranslated());
    } else if (filters.fullyTranslated === false) {
      filter.push(searchConditions.isNotFullyTranslated());
    }
    if (filters.partiallyTranslated === true) {
      filter.push(searchConditions.isPartiallyTranslated());
    } else if (filters.partiallyTranslated === false) {
      filter.push(searchConditions.isNotPartiallyTranslated());
    }
    if (filters.untranslatable === true) {
      filter.push(searchConditions.isUntranslatable());
    } else if (filters.untranslatable === false) {
      filter.push(searchConditions.isNotUntranslatable());
    }
    return { bool: { filter } };
  }
}
