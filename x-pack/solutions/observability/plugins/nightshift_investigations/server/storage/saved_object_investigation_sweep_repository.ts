/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, Logger, SavedObjectsServiceStart } from '@kbn/core/server';
import { SavedObjectsErrorHelpers, SavedObjectsUtils } from '@kbn/core/server';
import { asyncMapWithLimit } from '@kbn/std';
import { NIGHTSHIFT_INVESTIGATION_SO_TYPE } from '../saved_objects';
import { buildInvestigationFilter } from './build_investigation_filter';
import { InvestigationStaleWriteError } from './errors';
import type {
  DeleteAllInvestigationsFailure,
  DeleteAllInvestigationsResult,
  FindInvestigationsAcrossSpacesResult,
  FindInvestigationsQuery,
  InvestigationAttributes,
  InvestigationPatch,
  InvestigationSweepRepository,
} from './types';

const DELETE_BATCH_SIZE = 1000;
const MAX_CONCURRENT_SPACE_DELETES = 10;

export interface SavedObjectInvestigationSweepRepositoryDeps {
  /** Unscoped, so a single search covers every space. */
  savedObjects: ISavedObjectsRepository;
  logger: Logger;
}

export class SavedObjectInvestigationSweepRepository implements InvestigationSweepRepository {
  private readonly savedObjects: ISavedObjectsRepository;
  private readonly logger: Logger;

  constructor({ savedObjects, logger }: SavedObjectInvestigationSweepRepositoryDeps) {
    this.savedObjects = savedObjects;
    this.logger = logger;
  }

  async findAcrossSpaces<
    Fields extends keyof InvestigationAttributes = keyof InvestigationAttributes
  >(query: FindInvestigationsQuery<Fields>): Promise<FindInvestigationsAcrossSpacesResult<Fields>> {
    const result = await this.savedObjects.find<Pick<InvestigationAttributes, Fields>>({
      type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      namespaces: ['*'],
      filter: buildInvestigationFilter(query),
      sortField: query.sortField ?? 'created_at',
      sortOrder: query.sortOrder ?? 'desc',
      page: query.page,
      perPage: query.perPage,
      fields: query.fields,
    });

    return {
      results: result.saved_objects.map((savedObject) => ({
        investigation: {
          id: savedObject.id,
          version: savedObject.version,
          ...savedObject.attributes,
        },
        spaceId: SavedObjectsUtils.namespaceIdToString(savedObject.namespaces?.[0]),
      })),
      total: result.total,
      page: result.page,
      size: result.per_page,
    };
  }

  async updateInSpace({
    id,
    spaceId,
    patch,
    version,
  }: {
    id: string;
    spaceId: string;
    patch: InvestigationPatch;
    version?: string;
  }): Promise<void> {
    try {
      await this.savedObjects.update<InvestigationAttributes>(
        NIGHTSHIFT_INVESTIGATION_SO_TYPE,
        id,
        patch,
        { namespace: spaceId, version }
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isConflictError(error)) {
        throw new InvestigationStaleWriteError(id);
      }
      throw error;
    }
  }

  async deleteAllAcrossSpaces(): Promise<DeleteAllInvestigationsResult> {
    let deleted = 0;
    const failures: DeleteAllInvestigationsFailure[] = [];
    const finder = this.savedObjects.createPointInTimeFinder<InvestigationAttributes>({
      type: NIGHTSHIFT_INVESTIGATION_SO_TYPE,
      namespaces: ['*'],
      perPage: DELETE_BATCH_SIZE,
      fields: [],
    });

    try {
      for await (const { saved_objects: savedObjects } of finder.find()) {
        const bySpace = new Map<string, string[]>();
        for (const savedObject of savedObjects) {
          const spaceId = SavedObjectsUtils.namespaceIdToString(savedObject.namespaces?.[0]);
          const ids = bySpace.get(spaceId) ?? [];
          ids.push(savedObject.id);
          bySpace.set(spaceId, ids);
        }

        const results = await asyncMapWithLimit(
          [...bySpace],
          MAX_CONCURRENT_SPACE_DELETES,
          async ([spaceId, ids]) => {
            try {
              const { statuses } = await this.savedObjects.bulkDelete(
                ids.map((id) => ({ type: NIGHTSHIFT_INVESTIGATION_SO_TYPE, id })),
                { namespace: spaceId }
              );

              return {
                deleted: statuses.filter(({ success }) => success).length,
                failures: statuses.flatMap<DeleteAllInvestigationsFailure>((status) => {
                  if (status.success || status.error?.statusCode === 404) {
                    return [];
                  }
                  return [
                    {
                      id: status.id,
                      spaceId,
                      error: status.error?.message ?? 'investigation was not deleted',
                    },
                  ];
                }),
              };
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              return {
                deleted: 0,
                failures: ids.map((id) => ({ id, spaceId, error: message })),
              };
            }
          }
        );

        for (const result of results) {
          deleted += result.deleted;
          failures.push(...result.failures);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete investigations across all spaces: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    } finally {
      await finder.close();
    }

    this.logger.info(
      `Deleted ${deleted} investigation(s) across all spaces with ${failures.length} failure(s)`
    );
    for (const failure of failures) {
      this.logger.warn(
        `Failed to delete investigation "${failure.id}" in space "${failure.spaceId}": ${failure.error}`
      );
    }

    return { deleted, failures };
  }
}

/** Builds a repository that reaches every space, for use outside a request. */
export const createInvestigationSweepRepository = (
  savedObjects: SavedObjectsServiceStart,
  logger: Logger
): InvestigationSweepRepository =>
  new SavedObjectInvestigationSweepRepository({
    savedObjects: savedObjects.createInternalRepository([NIGHTSHIFT_INVESTIGATION_SO_TYPE]),
    logger,
  });
