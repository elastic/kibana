/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { AggregationsCompositeAggregateKey } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger, SavedObjectsClient } from '@kbn/core/server';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../../common/constants';
import type { StoredSLODefinition } from '../../../domain/models';
import { SO_SLO_TYPE } from '../../../saved_objects';

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

type RunResult = AbortedRunResult | CompletedRunResult;

interface SLO {
  id: string;
  revision: number;
}

type SLOKey = `${SLO['id']}:::${SLO['revision']}`;

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_MAX_RUNS = 10;

export async function cleanupOrphanSummaries(
  params: RunParams,
  dependencies: Dependencies
): Promise<RunResult> {
  const { esClient, logger } = dependencies;
  const chunkSize = params.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const maxRuns = params.maxRuns ?? DEFAULT_MAX_RUNS;
  let searchAfter = params.searchAfter;
  let currentRun = 0;

  try {
    do {
      currentRun++;

      const { list, nextSearchAfter } = await fetchUniqueSloFromSummary(
        searchAfter,
        chunkSize,
        dependencies
      );
      searchAfter = nextSearchAfter;

      if (list.length === 0) {
        logger.debug(`No more SLO summary items to process`);
        return { aborted: false, completed: true };
      }

      const existingDefinitionSet = await findSloDefinitionSet(list, dependencies);
      const nextDelete = list.filter((item) => !existingDefinitionSet.has(getKey(item)));

      if (nextDelete.length > 0) {
        logger.debug(
          `Deleting ${nextDelete.length} SLO ids from the summary index (including all their instances)`
        );

        await esClient.deleteByQuery(
          {
            index: SUMMARY_DESTINATION_INDEX_PATTERN,
            wait_for_completion: false,
            conflicts: 'proceed',
            slices: 'auto',
            query: {
              bool: {
                should: nextDelete.map(({ id, revision }) => {
                  return {
                    bool: {
                      must: [
                        {
                          term: {
                            'slo.id': id,
                          },
                        },
                        {
                          term: {
                            'slo.revision': revision,
                          },
                        },
                      ],
                    },
                  };
                }),
              },
            },
          },
          { signal: dependencies.abortController.signal }
        );
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
    throw error;
  }

  return { aborted: false, completed: true };
}

async function fetchUniqueSloFromSummary(
  searchAfter: AggregationsCompositeAggregateKey | undefined,
  chunkSize: number,
  { logger, esClient, abortController }: Dependencies
): Promise<{
  nextSearchAfter: AggregationsCompositeAggregateKey | undefined;
  list: Array<SLO>;
}> {
  logger.debug(
    `Fetching unique SLO (id, revision) tuples from summary index after ${JSON.stringify(
      searchAfter
    )}`
  );

  const result = await esClient.search<
    unknown,
    {
      id_revision: {
        after_key: AggregationsCompositeAggregateKey;
        buckets: Array<{
          key: {
            id: string;
            revision: number;
          };
        }>;
      };
    }
  >(
    {
      size: 0,
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      aggs: {
        id_revision: {
          composite: {
            size: chunkSize,
            sources: [
              {
                id: {
                  terms: {
                    field: 'slo.id',
                  },
                },
              },
              {
                revision: {
                  terms: {
                    field: 'slo.revision',
                  },
                },
              },
            ],
            after: searchAfter,
          },
        },
      },
    },
    { signal: abortController.signal }
  );

  const buckets = result.aggregations?.id_revision.buckets ?? [];
  if (buckets.length === 0) {
    return {
      nextSearchAfter: undefined,
      list: [],
    };
  }

  return {
    nextSearchAfter:
      buckets.length < chunkSize ? undefined : result.aggregations?.id_revision.after_key,
    list: buckets.map(({ key }) => ({
      id: String(key.id),
      revision: Number(key.revision),
    })),
  };
}

async function findSloDefinitionSet(
  list: Array<SLO>,
  { logger, soClient }: Dependencies
): Promise<Set<SLOKey>> {
  const response = await soClient.find<Pick<StoredSLODefinition, 'id' | 'revision'>>({
    type: SO_SLO_TYPE,
    page: 1,
    perPage: list.length,
    filter: `slo.attributes.id:(${list.map((item) => item.id).join(' or ')})`,
    namespaces: [ALL_SPACES_ID],
    fields: ['id', 'revision'],
  });

  logger.debug(
    `Found ${response.total} matching SLO definitions for ${list.length} SLO summary items to check`
  );

  if (response.total === 0) {
    return new Set();
  }

  return new Set(
    response.saved_objects.map(({ attributes }) =>
      getKey({
        id: attributes.id,
        revision: attributes.revision,
      })
    )
  );
}

function getKey(item: SLO): SLOKey {
  return `${item.id}:::${item.revision}`;
}
