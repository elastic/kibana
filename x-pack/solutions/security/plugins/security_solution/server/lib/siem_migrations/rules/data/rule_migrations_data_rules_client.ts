/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsFilterAggregate,
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';
import type { RuleMigrationFilters } from '../../../../../common/siem_migrations/types';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import {
  type RuleMigrationTaskStats,
  type RuleMigrationTranslationStats,
  type RuleMigrationAllIntegrationsStats,
  type RuleMigrationRule,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { getSortingOptions, type RuleMigrationSort } from './sort';
import { conditions as searchConditions } from './search';
import { MAX_ES_SEARCH_SIZE } from '../constants';
import type {
  CreateMigrationItemInput,
  SiemMigrationItemSort,
} from '../../common/data/siem_migrations_data_item_client';
import { SiemMigrationsDataItemClient } from '../../common/data/siem_migrations_data_item_client';

export type CreateRuleMigrationRulesInput = CreateMigrationItemInput<RuleMigrationRule>;
export type RuleMigrationDataStats = Omit<RuleMigrationTaskStats, 'name' | 'status'>;
export type RuleMigrationAllDataStats = RuleMigrationDataStats[];

export interface RuleMigrationGetRulesOptions {
  filters?: RuleMigrationFilters;
  sort?: RuleMigrationSort;
  from?: number;
  size?: number;
}

export class RuleMigrationsDataRulesClient extends SiemMigrationsDataItemClient<RuleMigrationRule> {
  protected type = 'rule' as const;

  /** Retrieves the translation stats for the rule migrations with the provided id */
  public async getTranslationStats(migrationId: string): Promise<RuleMigrationTranslationStats> {
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

  /** Retrieves the stats for the integrations of all the migration rules */
  public async getAllIntegrationsStats(): Promise<RuleMigrationAllIntegrationsStats> {
    const index = await this.getIndexName();
    const aggregations: { integrationIds: AggregationsAggregationContainer } = {
      integrationIds: {
        terms: {
          field: 'elastic_rule.integration_ids', // aggregate by integration ids
          exclude: '', // excluding empty string integration ids
          size: MAX_ES_SEARCH_SIZE,
        },
      },
    };
    const result = await this.esClient
      .search({ index, aggregations, _source: false })
      .catch((error) => {
        this.logger.error(`Error getting all integrations stats: ${error.message}`);
        throw error;
      });

    const integrationsAgg = result.aggregations?.integrationIds as AggregationsStringTermsAggregate;
    const buckets = (integrationsAgg?.buckets as AggregationsStringTermsBucket[]) ?? [];
    return buckets.map((bucket) => ({
      id: `${bucket.key}`,
      total_rules: bucket.doc_count,
    }));
  }

  protected getFilterQuery(
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

  protected getSortOptions(sort: SiemMigrationItemSort = {}): estypes.Sort {
    return getSortingOptions(sort);
  }
}
