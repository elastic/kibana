/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import assert from 'assert';
import type {
  AggregationsAggregationContainer,
  AggregationsMinAggregate,
  AggregationsStringTermsAggregate,
  AggregationsStringTermsBucket,
} from '@elastic/elasticsearch/lib/api/types';
import type { Adapters, StoredSiemMigration } from '../types';
import { MAX_ES_SEARCH_SIZE } from '../constants';

export class RuleMigrationSpaceIndexMigrator {
  constructor(
    private spaceId: string,
    private esClient: ElasticsearchClient,
    private logger: Logger,
    private ruleMigrationIndexAdapters: Adapters
  ) {}

  private async getExistingMigrationFromRulesIndex() {
    const index = this.ruleMigrationIndexAdapters.rules.getIndexName(this.spaceId);
    const aggregations: Record<string, AggregationsAggregationContainer> = {
      migrationIds: {
        terms: { field: 'migration_id', order: { createdAt: 'asc' }, size: MAX_ES_SEARCH_SIZE },
        aggregations: {
          createdAt: { min: { field: '@timestamp' } },
          createdBy: { terms: { field: 'created_by' } },
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
      id: `${bucket.key}`,
      created_at: (bucket.createdAt as AggregationsMinAggregate | undefined)
        ?.value_as_string as string,
      created_by: (
        (bucket.createdBy as AggregationsStringTermsAggregate)
          .buckets as AggregationsStringTermsBucket[]
      )[0].key as string,
    }));
  }

  private async getExistingMigrationFromMigrationsIndex() {
    const index = this.ruleMigrationIndexAdapters.migrations.getIndexName(this.spaceId);
    const result = await this.esClient.search<StoredSiemMigration>({
      index,
      size: MAX_ES_SEARCH_SIZE,
      query: {
        match_all: {},
      },
      _source: true,
    });

    return result.hits.hits.map(({ _id }) => {
      assert(_id, 'document should have _id');
      return _id;
    });
  }

  private async indexMigrationDocs(docs: StoredSiemMigration[]) {
    const indexName = this.ruleMigrationIndexAdapters.migrations.getIndexName(this.spaceId);
    const createOperations = docs.flatMap((doc) => [
      {
        create: {
          _id: doc.id,
          _index: indexName,
        },
      },
      {
        ...doc,
      },
    ]);

    return this.esClient.bulk({
      refresh: 'wait_for',
      operations: createOperations,
    });
  }

  async run() {
    await this.migrateRuleMigrationIndex();
  }

  /**
   * Creates the rule migration index if it doesn't exist and indexes any missing migration documents
   * from the rules index.
   *
   */
  private async migrateRuleMigrationIndex() {
    const installedIndexName =
      await this.ruleMigrationIndexAdapters.migrations.getInstalledIndexName(this.spaceId);
    if (!installedIndexName) {
      await this.ruleMigrationIndexAdapters.migrations.createIndex(this.spaceId);
    }

    const existingMigrationsFromRulesIndex = await this.getExistingMigrationFromRulesIndex();
    const existingMigrationsFromMigrationsIndex =
      await this.getExistingMigrationFromMigrationsIndex();

    const migrationsToIndex = existingMigrationsFromRulesIndex.filter(
      (migration) => !existingMigrationsFromMigrationsIndex.some((id) => id === migration.id)
    );

    if (migrationsToIndex.length > 0) {
      this.logger.info(
        `Found ${migrationsToIndex.length} rule migration documents from rules index with an absent migration doc. Creating corresponding migration documents.`
      );
      await this.indexMigrationDocs(migrationsToIndex);
      this.logger.info(
        `Created ${migrationsToIndex.length} rule migration documents from rules index with an absent migration doc.`
      );
    }
  }
}
