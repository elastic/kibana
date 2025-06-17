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
  private namesMap?: Map<string, string>;

  constructor(
    private spaceId: string,
    private esClient: ElasticsearchClient,
    private logger: Logger,
    private ruleMigrationIndexAdapters: Adapters
  ) {}

  /**
   * Runs the migrators for the rule migration index in the specified space.
   * It migrates existing rules to create migration documents and populates migration names.
   *
   * If any errors occur they are logged but should not prevent the server from starting.
   */
  async run() {
    this.logger.debug(`Starting migrators for space ${this.spaceId}`);
    try {
      await this.migrateRuleMigrationIndex();
    } catch (error) {
      this.logger.error(
        `Error migrating rule migration index for space ${this.spaceId}: ${error.message}`
      );
    }
    try {
      await this.populateMigrationNames();
    } catch (error) {
      this.logger.error(
        `Error populating migration names for space ${this.spaceId}: ${error.message}`
      );
    }
    this.logger.debug(`Finished migrators for space ${this.spaceId}`);
  }

  /**
   * Migrates the rule migration index by creating migration documents for existing rules
   * that do not have corresponding migration documents in the migrations index.
   */
  private async migrateRuleMigrationIndex() {
    const installedIndexName =
      await this.ruleMigrationIndexAdapters.migrations.getInstalledIndexName(this.spaceId);
    if (!installedIndexName) {
      await this.ruleMigrationIndexAdapters.migrations.createIndex(this.spaceId);
    }

    const existingMigrationsFromRulesIndex = await this.getExistingMigrationFromRulesIndex();
    const existingMigrationsFromMigrationsIndex =
      await this.getExistingMigrationIdsFromMigrationsIndex();

    const migrationsToIndex = existingMigrationsFromRulesIndex.filter(
      (migration) => !existingMigrationsFromMigrationsIndex.some((id) => id === migration.id)
    );

    if (migrationsToIndex.length > 0) {
      const getMigrationName = await this.createGetMigrationsName();
      await this.createMigrationDocs(
        migrationsToIndex.map((migration) => ({
          ...migration,
          created_by: migration.created_by ?? '',
          created_at: migration.created_at ?? new Date().toISOString(),
          name: getMigrationName(migration.id),
        }))
      );
      this.logger.debug(`Created ${migrationsToIndex.length} migration documents missing.`);
    }
  }

  /**
   * Populates migration documents that do not have a name field with generated names.
   * The names are generated based on the migration creation order, like the existing migrations are named in the runtime.
   */
  private async populateMigrationNames() {
    const migrationIdsWithoutName = await this.getMigrationIdsWithoutName();

    if (migrationIdsWithoutName.length > 0) {
      const getMigrationName = await this.createGetMigrationsName();

      const migrationsToUpdate = migrationIdsWithoutName.map((id) => {
        return { id, name: getMigrationName(id) };
      });

      await this.updateMigrationDocs(migrationsToUpdate);
      this.logger.debug(`Updated ${migrationsToUpdate.length} migrations with generated name.`);
    }
  }

  /**
   * Creates migration documents in the migrations index.
   */
  private async createMigrationDocs(docs: StoredSiemMigration[]) {
    const _index = this.ruleMigrationIndexAdapters.migrations.getIndexName(this.spaceId);
    const operations = docs.flatMap(({ id: _id, ...doc }) => [
      { create: { _id, _index } },
      { ...doc },
    ]);
    return this.esClient.bulk({ refresh: 'wait_for', operations });
  }

  /**
   * Updates migration documents in the migrations index.
   */
  private async updateMigrationDocs(docs: Array<Partial<StoredSiemMigration>>) {
    const _index = this.ruleMigrationIndexAdapters.migrations.getIndexName(this.spaceId);
    const operations = docs.flatMap(({ id: _id, ...doc }) => [
      { update: { _id, _index } },
      { doc },
    ]);
    return this.esClient.bulk({ refresh: 'wait_for', operations });
  }

  /**
   * Retrieves existing migrations from the rules index.
   * It aggregates by migration_id and returns the earliest created_at and created_by for each migration.
   */
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
    const result = await this.esClient.search({ index, aggregations, _source: false });

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

  /**
   * Retrieves existing migrations from the migrations index.
   * It returns the IDs of all migration documents.
   */
  private async getExistingMigrationIdsFromMigrationsIndex(): Promise<string[]> {
    const index = this.ruleMigrationIndexAdapters.migrations.getIndexName(this.spaceId);
    const result = await this.esClient.search<StoredSiemMigration>({
      index,
      size: MAX_ES_SEARCH_SIZE,
      query: { match_all: {} },
      _source: false,
    });

    return result.hits.hits.map(({ _id }) => {
      assert(_id, 'document should have _id');
      return _id;
    });
  }

  /**
   * Retrieves migration IDs from the migrations index that do not have a name field.
   */
  private async getMigrationIdsWithoutName(): Promise<string[]> {
    const index = this.ruleMigrationIndexAdapters.migrations.getIndexName(this.spaceId);

    const result = await this.esClient.search<StoredSiemMigration>({
      index,
      query: { bool: { must_not: { exists: { field: 'name' } } } },
      size: MAX_ES_SEARCH_SIZE,
      _source: false,
    });

    return result.hits.hits.map(({ _id }) => {
      assert(_id, 'document should have _id');
      return _id;
    });
  }

  /**
   * Retrieves the names of all migrations from the migrations index.
   * The names are generated based on the migration the creation order.
   */
  private async createGetMigrationsName(): Promise<(id: string) => string> {
    // Cache the names map to avoid repeat the aggregation query
    if (!this.namesMap) {
      const index = this.ruleMigrationIndexAdapters.rules.getIndexName(this.spaceId);

      // Same migrationIds aggregation as the getAllStats method of the data client
      const aggregations: { migrationIds: AggregationsAggregationContainer } = {
        migrationIds: {
          terms: { field: 'migration_id', order: { createdAt: 'asc' }, size: MAX_ES_SEARCH_SIZE },
          aggregations: { createdAt: { min: { field: '@timestamp' } } },
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
      const migrationsNames = buckets.map((bucket, i) => ({
        id: `${bucket.key}`,
        name: `SIEM rules migration #${i + 1}`, // the same naming pattern as in older versions
      }));

      this.namesMap = new Map<string, string>(migrationsNames.map(({ id, name }) => [id, name]));
    }

    const getMigrationName = (migrationId: string): string => {
      return this.namesMap?.get(migrationId) ?? `SIEM Migration ${migrationId}`; // Fallback name using the ID (should never happen, but just in case)
    };

    return getMigrationName;
  }
}
