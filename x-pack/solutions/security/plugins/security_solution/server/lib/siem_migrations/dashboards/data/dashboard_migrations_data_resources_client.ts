/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sha256 } from 'js-sha256';
import type { QueryDslQueryContainer, Duration } from '@elastic/elasticsearch/lib/api/types';

import type {
  SiemMigrationResource,
  SiemMigrationResourceBase,
  SiemMigrationResourceType,
} from '../../../../../common/siem_migrations/model/common.gen';
import { SiemMigrationsDataBaseClient } from '../../common/data/siem_migrations_data_base_client';

export type CreateDashboardMigrationResourceInput = Pick<
  SiemMigrationResource,
  'migration_id' | 'type' | 'name' | 'content' | 'metadata'
>;

export interface DashboardMigrationResourceFilters {
  type?: SiemMigrationResourceType;
  names?: string[];
  hasContent?: boolean;
}

/* BULK_MAX_SIZE defines the number to break down the bulk operations by.
 * The 500 number was chosen as a reasonable number to avoid large payloads. It can be adjusted if needed.
 */
const BULK_MAX_SIZE = 500 as const;
/* DEFAULT_SEARCH_BATCH_SIZE defines the default number of documents to retrieve per search operation
 * when retrieving search results in batches. */
const DEFAULT_SEARCH_BATCH_SIZE = 500 as const;

export class DashboardMigrationsDataResourcesClient extends SiemMigrationsDataBaseClient {
  /** Creates the resources in the index only if they do not exist */
  public async create(resources: CreateDashboardMigrationResourceInput[]): Promise<void> {
    const index = await this.getIndexName();
    const profileId = await this.getProfileUid();

    let resourcesSlice: CreateDashboardMigrationResourceInput[];
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
          this.logger.error(`Error creating resources: ${error.message}`);
          throw error;
        });
    }
  }

  /** Returns batching functions to traverse all the migration resources search results */
  searchBatches<T extends SiemMigrationResourceBase = SiemMigrationResourceBase>(
    migrationId: string,
    options: { scroll?: Duration; size?: number; filters?: DashboardMigrationResourceFilters } = {}
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

  private createId(resource: CreateDashboardMigrationResourceInput): string {
    const key = `${resource.migration_id}-${resource.type}-${resource.name}`;
    return sha256.create().update(key).hex();
  }

  private getFilterQuery(
    migrationId: string,
    filters: DashboardMigrationResourceFilters = {}
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
