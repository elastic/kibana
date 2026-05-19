/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { AggregationsCompositeAggregateKey } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger, SavedObjectsClient } from '@kbn/core/server';
import { escapeKuery } from '@kbn/es-query';
import { COMPOSITE_SUMMARY_INDEX_NAME } from '../../../../common/constants';
import type { StoredCompositeSLODefinition } from '../../../domain/models';
import { buildCompositeSloSummaryDocId } from '../../composites/composite_slo_summary_index';
import { SO_SLO_COMPOSITE_TYPE } from '../../../saved_objects/slo_composite';

interface Dependencies {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClient;
  logger: Logger;
  abortController: AbortController;
}

interface RunParams {
  searchAfter?: AggregationsCompositeAggregateKey;
  chunkSize?: number;
  maxRuns?: number;
}

interface AbortedRunResult {
  aborted: true;
  completed: false;
  nextState: {
    searchAfter: AggregationsCompositeAggregateKey | undefined;
  };
}

interface CompletedRunResult {
  completed: true;
  aborted: false;
}

export type CleanupOrphanCompositeSummaryRunResult = AbortedRunResult | CompletedRunResult;

interface CompositeSummaryBucketKey {
  spaceId: string;
  compositeId: string;
}

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_MAX_RUNS = 10;

const ES_MISSING_INDEX_OPTS = {
  allow_no_indices: true,
  ignore_unavailable: true,
} as const;

export async function cleanupOrphanCompositeSummaries(
  params: RunParams,
  dependencies: Dependencies
): Promise<CleanupOrphanCompositeSummaryRunResult> {
  const { esClient, logger } = dependencies;
  const chunkSize = params.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const maxRuns = params.maxRuns ?? DEFAULT_MAX_RUNS;
  let searchAfter = params.searchAfter;
  let currentRun = 0;

  try {
    do {
      currentRun++;

      const { list, nextSearchAfter } = await fetchCompositeSummaryKeysFromIndex(
        searchAfter,
        chunkSize,
        dependencies
      );
      searchAfter = nextSearchAfter;

      if (list.length === 0) {
        logger.debug(`No more composite summary items to process`);
        return { aborted: false, completed: true };
      }

      const missingDocIds = await findMissingCompositeSavedObjectDocIds(list, dependencies);

      if (missingDocIds.length > 0) {
        logger.debug(
          `Deleting ${missingDocIds.length} orphan composite summaries from summary index`
        );

        try {
          await esClient.deleteByQuery(
            {
              index: COMPOSITE_SUMMARY_INDEX_NAME,
              ...ES_MISSING_INDEX_OPTS,
              wait_for_completion: false,
              conflicts: 'proceed',
              slices: 'auto',
              query: {
                ids: {
                  values: missingDocIds,
                },
              },
            },
            { signal: dependencies.abortController.signal }
          );
        } catch (error) {
          if (isElasticsearchIndexUnavailableError(error)) {
            logger.debug(`Composite summary index unavailable during deleteByQuery; ignoring`);
          } else {
            throw error;
          }
        }
      }

      if (currentRun >= maxRuns) {
        logger.debug(
          `Reached maximum number of runs (${maxRuns}), stopping here to avoid long running tasks`
        );
        return {
          aborted: true,
          completed: false,
          nextState: { searchAfter },
        };
      }
    } while (searchAfter);
  } catch (error) {
    if (error instanceof errors.RequestAbortedError) {
      logger.debug(`Task aborted during execution`);

      return {
        aborted: true,
        completed: false,
        nextState: { searchAfter },
      };
    }

    if (isElasticsearchIndexUnavailableError(error)) {
      logger.debug(`Composite summary index unavailable, skipping cleanup: ${String(error)}`);
      return { aborted: false, completed: true };
    }

    throw error;
  }

  return { aborted: false, completed: true };
}

async function fetchCompositeSummaryKeysFromIndex(
  searchAfter: AggregationsCompositeAggregateKey | undefined,
  chunkSize: number,
  { logger, esClient, abortController }: Dependencies
): Promise<{
  nextSearchAfter: AggregationsCompositeAggregateKey | undefined;
  list: CompositeSummaryBucketKey[];
}> {
  logger.debug(
    `Fetching unique composite summary (spaceId, compositeId) tuples after ${JSON.stringify(
      searchAfter
    )}`
  );

  const result = await esClient.search<
    unknown,
    {
      space_composite: {
        after_key?: AggregationsCompositeAggregateKey;
        buckets: Array<{
          key: {
            spaceId: string;
            compositeId: string;
          };
        }>;
      };
    }
  >(
    {
      size: 0,
      index: COMPOSITE_SUMMARY_INDEX_NAME,
      ...ES_MISSING_INDEX_OPTS,
      aggs: {
        space_composite: {
          composite: {
            size: chunkSize,
            sources: [
              {
                spaceId: {
                  terms: {
                    field: 'spaceId',
                  },
                },
              },
              {
                compositeId: {
                  terms: {
                    field: 'compositeSlo.id',
                  },
                },
              },
            ],
            ...(searchAfter ? { after: searchAfter } : {}),
          },
        },
      },
    },
    { signal: abortController.signal }
  );

  const spaceCompositeAgg = result.aggregations?.space_composite;
  const buckets = spaceCompositeAgg?.buckets ?? [];
  if (buckets.length === 0) {
    return {
      nextSearchAfter: undefined,
      list: [],
    };
  }

  return {
    nextSearchAfter: buckets.length < chunkSize ? undefined : spaceCompositeAgg?.after_key,
    list: buckets.map(({ key }) => ({
      spaceId: String(key.spaceId),
      compositeId: String(key.compositeId),
    })),
  };
}

async function findMissingCompositeSavedObjectDocIds(
  bucketKeys: CompositeSummaryBucketKey[],
  { logger, soClient }: Dependencies
): Promise<string[]> {
  const bySpaceIds = bucketKeysToUniqueIdsPerSpace(bucketKeys);
  const missingDocIds: string[] = [];

  for (const [spaceId, compositeIds] of bySpaceIds) {
    const response = await soClient.find<Pick<StoredCompositeSLODefinition, 'id'>>({
      type: SO_SLO_COMPOSITE_TYPE,
      page: 1,
      perPage: compositeIds.size,
      filter: `${SO_SLO_COMPOSITE_TYPE}.attributes.id:(${[...compositeIds]
        .map((id) => escapeKuery(id))
        .join(' or ')})`,
      namespaces: [spaceId],
      fields: ['id'],
    });

    logger.debug(
      `Space [${spaceId}]: Found ${response.total} composite SO definitions for ${compositeIds.size} summary keys to check`
    );

    const existing = new Set(response.saved_objects.map(({ attributes }) => String(attributes.id)));

    for (const compositeId of compositeIds) {
      if (!existing.has(compositeId)) {
        missingDocIds.push(buildCompositeSloSummaryDocId(spaceId, compositeId));
      }
    }
  }

  return missingDocIds;
}

function bucketKeysToUniqueIdsPerSpace(
  bucketKeys: CompositeSummaryBucketKey[]
): Map<string, Set<string>> {
  const bySpaceIds = new Map<string, Set<string>>();
  for (const { spaceId, compositeId } of bucketKeys) {
    let setForSpace = bySpaceIds.get(spaceId);
    if (!setForSpace) {
      setForSpace = new Set<string>();
      bySpaceIds.set(spaceId, setForSpace);
    }
    setForSpace.add(compositeId);
  }
  return bySpaceIds;
}

function isElasticsearchIndexUnavailableError(error: unknown): boolean {
  if (error instanceof errors.ResponseError) {
    return error.statusCode === 404 || error.body?.error?.type === 'index_not_found_exception';
  }

  const statusCode =
    typeof error === 'object' &&
    error !== null &&
    'meta' in error &&
    typeof (error as { meta?: { statusCode?: number } }).meta?.statusCode === 'number'
      ? (error as { meta: { statusCode: number } }).meta.statusCode
      : undefined;

  return statusCode === 404;
}
