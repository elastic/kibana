/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sha256 } from 'js-sha256';
import type {
  QueryDslQueryContainer,
  Duration,
  BulkOperationContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  RuleMigrationResource,
  RuleMigrationResourceType,
} from '../../../../../common/siem_migrations/model/rule_migration.gen';
import type { StoredRuleMigrationResource } from '../types';
import { RuleMigrationsDataBaseClient } from './rule_migrations_data_base_client';
import { MAX_ES_SEARCH_SIZE } from '../constants';

export type CreateRuleMigrationResourceInput = Pick<
  RuleMigrationResource,
  'migration_id' | 'type' | 'name' | 'content' | 'metadata'
>;
export interface RuleMigrationResourceFilters {
  type?: RuleMigrationResourceType;
  names?: string[];
  hasContent?: boolean;
}
export interface RuleMigrationResourceGetOptions {
  filters?: RuleMigrationResourceFilters;
  size?: number;
  from?: number;
}

/* BULK_MAX_SIZE defines the number to break down the bulk operations by.
 * The 500 number was chosen as a reasonable number to avoid large payloads. It can be adjusted if needed.
 */
const BULK_MAX_SIZE = 500 as const;
/* DEFAULT_SEARCH_BATCH_SIZE defines the default number of documents to retrieve per search operation
 * when retrieving search results in batches. */
const DEFAULT_SEARCH_BATCH_SIZE = 500 as const;

export class RuleMigrationsDataResourcesClient extends RuleMigrationsDataBaseClient {
  public async upsert(resources: CreateRuleMigrationResourceInput[]): Promise<void> {
    const index = await this.getIndexName();
    const profileId = await this.getProfileUid();

    let resourcesSlice: CreateRuleMigrationResourceInput[];

    const createdAt = new Date().toISOString();
    while ((resourcesSlice = resources.splice(0, BULK_MAX_SIZE)).length > 0) {
      await this.esClient
        .bulk({
          refresh: 'wait_for',
          operations: resourcesSlice.flatMap((resource) => [
            { update: { _id: this.createId(resource), _index: index } },
            {
              doc: {
                ...resource,
                '@timestamp': createdAt,
                updated_by: profileId,
                updated_at: createdAt,
              },
              doc_as_upsert: true,
            },
          ]),
        })
        .catch((error) => {
          this.logger.error(`Error upsert resources: ${error.message}`);
          throw error;
        });
    }
  }

  /** Creates the resources in the index only if they do not exist */
  public async create(resources: CreateRuleMigrationResourceInput[]): Promise<void> {
    const index = await this.getIndexName();
    const profileId = await this.getProfileUid();

    let resourcesSlice: CreateRuleMigrationResourceInput[];
    const createdAt = new Date().toISOString();
    while ((resourcesSlice = resources.splice(0, BULK_MAX_SIZE)).length > 0) {
      await this.esClient
        .bulk({
          refresh: 'wait_for',
          operations: resourcesSlice.flatMap((resource) => [
            { create: { _id: this.createId(resource), _index: index } },
            {
              ...resource,
              '@timestamp': createdAt,
              updated_by: profileId,
              updated_at: createdAt,
            },
          ]),
        })
        .catch((error) => {
          this.logger.error(`Error upsert resources: ${error.message}`);
          throw error;
        });
    }
  }

  public async get(
    migrationId: string,
    options: RuleMigrationResourceGetOptions = {}
  ): Promise<StoredRuleMigrationResource[]> {
    const { filters, size, from } = options;
    const index = await this.getIndexName();
    const query = this.getFilterQuery(migrationId, filters);

    return this.esClient
      .search<RuleMigrationResource>({ index, query, size, from })
      .then(this.processResponseHits.bind(this))
      .catch((error) => {
        this.logger.error(`Error searching resources: ${error.message}`);
        throw error;
      });
  }

  /** Returns batching functions to traverse all the migration resources search results */
  searchBatches<T extends RuleMigrationResource = RuleMigrationResource>(
    migrationId: string,
    options: { scroll?: Duration; size?: number; filters?: RuleMigrationResourceFilters } = {}
  ) {
    const { size = DEFAULT_SEARCH_BATCH_SIZE, filters = {}, scroll } = options;
    const query = this.getFilterQuery(migrationId, filters);
    const search = { query, sort: '_doc', scroll, size }; // sort by _doc to ensure consistent order
    try {
      return this.getSearchBatches<T>(search);
    } catch (error) {
      this.logger.error(`Error scrolling rule migration resources: ${error.message}`);
      throw error;
    }
  }

  private createId(resource: CreateRuleMigrationResourceInput): string {
    const key = `${resource.migration_id}-${resource.type}-${resource.name}`;
    return sha256.create().update(key).hex();
  }

  private getFilterQuery(
    migrationId: string,
    filters: RuleMigrationResourceFilters = {}
  ): QueryDslQueryContainer {
    const filter: QueryDslQueryContainer[] = [{ term: { migration_id: migrationId } }];
    if (filters.type) {
      filter.push({ term: { type: filters.type } });
    }
    if (filters.names) {
      filter.push({ terms: { name: filters.names } });
    }
    if (filters.hasContent != null) {
      const existContent = { exists: { field: 'content' } };
      if (filters.hasContent) {
        filter.push(existContent);
      } else {
        filter.push({ bool: { must_not: existContent } });
      }
    }
    return { bool: { filter } };
  }

  /**
   *
   * Prepares bulk ES delete operations for the resources of a given migrationId.
   *
   */
  async prepareDelete(migrationId: string): Promise<BulkOperationContainer[]> {
    const index = await this.getIndexName();
    const resourcesToBeDeleted = await this.get(migrationId, { size: MAX_ES_SEARCH_SIZE });
    const resourcesToBeDeletedDocIds = resourcesToBeDeleted.map((resource) => resource.id);
    return resourcesToBeDeletedDocIds.map((docId) => ({
      delete: {
        _id: docId,
        _index: index,
      },
    }));
  }
}
