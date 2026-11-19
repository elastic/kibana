/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type {
  QueryDslQueryContainer,
  Duration,
  BulkOperationContainer,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  SiemMigrationResource,
  SiemMigrationResourceType,
} from '../../../../../common/siem_migrations/model/common.gen';
import type { Stored } from '../types';
import { SiemMigrationsDataBaseClient } from './siem_migrations_data_base_client';
import { MAX_ES_SEARCH_SIZE } from './constants';

export type StoredSiemMigrationResource = Stored<SiemMigrationResource>;

export type CreateSiemMigrationResourceInput = Pick<
  SiemMigrationResource,
  'migration_id' | 'type' | 'name' | 'content' | 'metadata'
>;
export interface SiemMigrationResourceFilters {
  type?: SiemMigrationResourceType;
  names?: string[];
  hasContent?: boolean;
}
export interface SiemMigrationResourceGetOptions {
  filters?: SiemMigrationResourceFilters;
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

export class SiemMigrationsDataResourcesClient extends SiemMigrationsDataBaseClient {
  public async upsert(resources: CreateSiemMigrationResourceInput[]): Promise<void> {
    const index = await this.getIndexName();
    const profileId = await this.getProfileUid();

    const createdAt = new Date().toISOString();
    const bulkOperations = [];

    for (let i = 0; i < resources.length; i += BULK_MAX_SIZE) {
      const resourcesSlice = resources.slice(i, i + BULK_MAX_SIZE);
      bulkOperations.push(
        this.esClient
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
          })
      );
    }

    await Promise.all(bulkOperations);
  }

  /** Creates the resources in the index only if they do not exist */
  public async create(resources: CreateSiemMigrationResourceInput[]): Promise<void> {
    const index = await this.getIndexName();
    const profileId = await this.getProfileUid();

    const createdAt = new Date().toISOString();
    const bulkOperations = [];

    for (let i = 0; i < resources.length; i += BULK_MAX_SIZE) {
      const resourcesSlice = resources.slice(i, i + BULK_MAX_SIZE);
      bulkOperations.push(
        this.esClient
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
            this.logger.error(`Error creating resources: ${error.message}`);
            throw error;
          })
      );
    }

    await Promise.all(bulkOperations);
  }

  public async get(
    migrationId: string,
    options: SiemMigrationResourceGetOptions = {}
  ): Promise<StoredSiemMigrationResource[]> {
    const { filters, size, from } = options;
    const index = await this.getIndexName();
    const query = this.getFilterQuery(migrationId, filters);

    return this.esClient
      .search<SiemMigrationResource>({ index, query, size, from })
      .then(this.processResponseHits.bind(this))
      .catch((error) => {
        this.logger.error(`Error searching resources: ${error.message}`);
        throw error;
      });
  }

  /** Returns batching functions to traverse all the migration resources search results */
  public searchBatches<T extends SiemMigrationResource = SiemMigrationResource>(
    migrationId: string,
    options: { scroll?: Duration; size?: number; filters?: SiemMigrationResourceFilters } = {}
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

  /** Prepares bulk ES delete operations for the resources of a given migrationId. */
  public async prepareDelete(migrationId: string): Promise<BulkOperationContainer[]> {
    const index = await this.getIndexName();
    const resourcesToBeDeleted = await this.get(migrationId, { size: MAX_ES_SEARCH_SIZE });
    const resourcesToBeDeletedDocIds = resourcesToBeDeleted.map((resource) => resource.id);
    return resourcesToBeDeletedDocIds.map((docId) => ({
      delete: { _id: docId, _index: index },
    }));
  }

  private createId(resource: CreateSiemMigrationResourceInput): string {
    const key = `${resource.migration_id}-${resource.type}-${resource.name}`;
    return createHash('sha256').update(key).digest('hex');
  }

  private getFilterQuery(
    migrationId: string,
    filters: SiemMigrationResourceFilters = {}
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
}
