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
import type { SiemMigrationVendor } from '../../../../../common/siem_migrations/model/common.gen';
import type { RuleMigrationFilters } from '../../../../../common/siem_migrations/rules/types';
import { SiemMigrationStatus } from '../../../../../common/siem_migrations/constants';
import {
  type RuleMigrationTaskStats,
  type RuleMigrationTranslationStats,
  type RuleMigrationAllIntegrationsStats,
  type RuleMigrationRule,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { MISSING_INDEX_PATTERN_PLACEHOLDER } from '../../common/constants';
import type { CreateMigrationItemInput } from '../../common/data/siem_migrations_data_item_client';
import { SiemMigrationsDataItemClient } from '../../common/data/siem_migrations_data_item_client';
import { MAX_ES_SEARCH_SIZE } from '../../common/data/constants';
import type { SiemMigrationGetItemsOptions, SiemMigrationSort } from '../../common/data/types';
import { getSortingOptions } from './sort';
import { dsl } from './dsl_queries';

export type CreateRuleMigrationRulesInput = CreateMigrationItemInput<RuleMigrationRule>;
export type RuleMigrationDataStats = Omit<RuleMigrationTaskStats, 'name' | 'status'>;
export type RuleMigrationAllDataStats = RuleMigrationDataStats[];

export type RuleMigrationGetRulesOptions = SiemMigrationGetItemsOptions<RuleMigrationFilters>;

export class RuleMigrationsDataRulesClient extends SiemMigrationsDataItemClient<RuleMigrationRule> {
  protected type = 'rule' as const;

  public async getVendor(migrationId: string): Promise<SiemMigrationVendor | undefined> {
    const { data: rules } = await this.get(migrationId, { size: 1 });
    return rules.length > 0 ? rules[0].original_rule.vendor : undefined;
  }

  /** Retrieves the translation stats for the rule migrations with the provided id */
  public async getTranslationStats(migrationId: string): Promise<RuleMigrationTranslationStats> {
    const index = await this.getIndexName();
    const query = this.getFilterQuery(migrationId);

    const aggregations = {
      success: {
        filter: { term: { status: SiemMigrationStatus.COMPLETED } },
        aggs: {
          result: { terms: { field: 'translation_result' } },
          installable: { filter: dsl.isInstallable() },
          prebuilt: { filter: dsl.isPrebuilt() },
          missing_index: { filter: dsl.isMissingIndex() },
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
          missing_index: (successAgg.missing_index as AggregationsFilterAggregate)?.doc_count ?? 0,
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
  ): { bool: { filter: QueryDslQueryContainer[] } } {
    const { filter } = super.getFilterQuery(migrationId, filters).bool;

    // Rules specific filters
    if (filters.searchTerm?.length) {
      filter.push(dsl.matchTitle(filters.searchTerm));
    }
    if (filters.titles?.length) {
      filter.push(dsl.matchTitles(filters.titles));
    }
    if (filters.installed != null) {
      filter.push(filters.installed ? dsl.isInstalled() : dsl.isNotInstalled());
    }
    if (filters.installable != null) {
      filter.push(filters.installable ? dsl.isInstallable() : dsl.isNotInstallable());
    }
    if (filters.prebuilt != null) {
      filter.push(filters.prebuilt ? dsl.isPrebuilt() : dsl.isCustom());
    }
    if (filters.missingIndex) {
      filter.push(dsl.isMissingIndex());
    }

    return { bool: { filter } };
  }

  protected getSortOptions(sort: SiemMigrationSort = {}): estypes.Sort {
    return getSortingOptions(sort);
  }

  async updateIndexPattern(
    id: string,
    indexPattern: string,
    translatedRuleIds?: string[]
  ): Promise<number | undefined> {
    const index = await this.getIndexName();
    const additionalFilter: RuleMigrationFilters = { missingIndex: true };
    if (translatedRuleIds) {
      additionalFilter.ids = translatedRuleIds;
    }
    const query = this.getFilterQuery(id, additionalFilter);

    const result = await this.esClient
      .updateByQuery({
        index,
        script: {
          source: `
                def originalQuery = ctx._source.elastic_rule.query;
                def newQuery = originalQuery.replace('${MISSING_INDEX_PATTERN_PLACEHOLDER}', params.indexPattern);
                ctx._source.elastic_rule.query = newQuery;
              `,
          lang: 'painless',
          params: {
            indexPattern,
          },
        },
        query,
        refresh: true,
      })
      .catch((error) => {
        this.logger.error(`Error updating index pattern for migration ${id}: ${error}`);
        throw error;
      });

    return result.updated;
  }
}
