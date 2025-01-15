/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { Status } from '@kbn/investigation-shared';
import { investigationSchema } from '@kbn/investigation-shared';
import { Investigation, StoredInvestigation } from '../models/investigation';
import { Paginated, Pagination } from '../models/pagination';
import { SO_INVESTIGATION_TYPE } from '../saved_objects/investigation';

export interface Search {
  search: string;
}
interface Stats {
  count: Record<Status, number>;
  total: number;
}

export interface InvestigationRepository {
  save(investigation: Investigation): Promise<void>;
  findById(id: string): Promise<Investigation>;
  deleteById(id: string): Promise<void>;
  search({
    search,
    filter,
    pagination,
  }: {
    search?: Search;
    filter?: string;
    pagination: Pagination;
  }): Promise<Paginated<Investigation>>;
  findAllTags(): Promise<string[]>;
  getStats(): Promise<Stats>;
}

export function investigationRepositoryFactory({
  soClient,
  logger,
}: {
  soClient: SavedObjectsClientContract;
  logger: Logger;
}): InvestigationRepository {
  function toInvestigation(stored: StoredInvestigation): Investigation | undefined {
    const result = investigationSchema.safeParse(stored);

    if (!result.success) {
      logger.error(`Invalid stored Investigation with id [${stored.id}]`);
      return undefined;
    }

    return result.data;
  }

  function toStoredInvestigation(investigation: Investigation): StoredInvestigation {
    return investigationSchema.parse(investigation);
  }

  return {
    async save(investigation: Investigation): Promise<void> {
      await soClient.create<StoredInvestigation>(
        SO_INVESTIGATION_TYPE,
        toStoredInvestigation(investigation),
        {
          id: investigation.id,
          overwrite: true,
        }
      );
    },

    async findById(id: string): Promise<Investigation> {
      const response = await soClient.find<StoredInvestigation>({
        type: SO_INVESTIGATION_TYPE,
        page: 1,
        perPage: 1,
        filter: `investigation.attributes.id:(${id})`,
      });

      if (response.total === 0) {
        throw new Error(`Investigation [${id}] not found`);
      }

      const investigation = toInvestigation(response.saved_objects[0].attributes);
      if (investigation === undefined) {
        throw new Error('Invalid stored Investigation');
      }

      return investigation;
    },

    async deleteById(id: string): Promise<void> {
      const response = await soClient.find<StoredInvestigation>({
        type: SO_INVESTIGATION_TYPE,
        page: 1,
        perPage: 1,
        filter: `investigation.attributes.id:(${id})`,
      });

      if (response.total === 0) {
        throw new Error(`Investigation [${id}] not found`);
      }

      await soClient.delete(SO_INVESTIGATION_TYPE, response.saved_objects[0].id);
    },

    async search({ search, filter, pagination }): Promise<Paginated<Investigation>> {
      const response = await soClient.find<StoredInvestigation>({
        type: SO_INVESTIGATION_TYPE,
        page: pagination.page,
        perPage: pagination.perPage,
        sortField: 'updated_at',
        sortOrder: 'desc',
        ...(filter && { filter }),
        ...(search && { search: search.search }),
      });

      return {
        total: response.total,
        perPage: response.per_page,
        page: response.page,
        results: response.saved_objects
          .map((savedObject) => toInvestigation(savedObject.attributes))
          .filter((investigation) => investigation !== undefined) as Investigation[],
      };
    },

    async findAllTags(): Promise<string[]> {
      interface AggsTagsTerms {
        tags: { buckets: [{ key: string }] };
      }

      const response = await soClient.find<StoredInvestigation, AggsTagsTerms>({
        type: SO_INVESTIGATION_TYPE,
        aggs: {
          tags: {
            terms: {
              field: 'investigation.attributes.tags',
              size: 10000,
            },
          },
        },
      });

      return response.aggregations?.tags?.buckets.map((bucket) => bucket.key) ?? [];
    },

    async getStats(): Promise<{ count: Record<Status, number>; total: number }> {
      interface AggsStatusTerms {
        status: { buckets: [{ key: string; doc_count: number }] };
      }

      const response = await soClient.find<StoredInvestigation, AggsStatusTerms>({
        type: SO_INVESTIGATION_TYPE,
        aggs: {
          status: {
            terms: {
              field: 'investigation.attributes.status',
              size: 10,
            },
          },
        },
      });

      const countByStatus: Record<Status, number> = {
        active: 0,
        triage: 0,
        mitigated: 0,
        resolved: 0,
        cancelled: 0,
      };

      return {
        count:
          response.aggregations?.status?.buckets.reduce(
            (acc, bucket) => ({ ...acc, [bucket.key]: bucket.doc_count }),
            countByStatus
          ) ?? countByStatus,
        total: response.total,
      };
    },
  };
}
