/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { AggregationsCompositeAggregateKey } from '@elastic/elasticsearch/lib/api/types';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { StoredSLODefinition } from '../../domain/models';
import { SO_SLO_TYPE } from '../../saved_objects';
import { SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../common/constants';
import { SLOConfig } from '../../types';

export const TASK_TYPE = 'SLO:ORPHAN_SUMMARIES-CLEANUP-TASK';

export const getDeleteQueryFilter = (
  sloSummaryIdsToDelete: Array<{ id: string; revision: number }>
) => {
  return sloSummaryIdsToDelete.map(({ id, revision }) => {
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
              'slo.revision': Number(revision),
            },
          },
        ],
      },
    };
  });
};

export class SloOrphanSummaryCleanupTask {
  private abortController = new AbortController();
  private logger: Logger;
  private taskManager?: TaskManagerStartContract;
  private soClient?: SavedObjectsClientContract;
  private esClient?: ElasticsearchClient;
  private config: SLOConfig;

  constructor(taskManager: TaskManagerSetupContract, logger: Logger, config: SLOConfig) {
    this.logger = logger;
    this.config = config;

    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'SLO Definitions Cleanup Task',
        timeout: '3m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask();
            },

            cancel: async () => {
              this.abortController.abort('orphan-slo-summary-cleanup task timed out');
            },
          };
        },
      },
    });
  }

  runTask = async () => {
    if (this.soClient && this.esClient) {
      let searchAfterKey: AggregationsCompositeAggregateKey | undefined;

      do {
        const { sloSummaryIds, searchAfter } = await this.fetchSloSummariesIds(searchAfterKey);

        if (sloSummaryIds.length === 0) {
          return;
        }

        searchAfterKey = searchAfter;

        const ids = sloSummaryIds.map(({ id }) => id);

        const sloDefinitions = await this.findSloDefinitions(ids);

        const sloSummaryIdsToDelete = sloSummaryIds.filter(
          ({ id, revision }) =>
            !sloDefinitions.find(
              (attributes) => attributes.id === id && attributes.revision === revision
            )
        );

        if (sloSummaryIdsToDelete.length > 0) {
          this.logger.info(
            `[SLO] Deleting ${sloSummaryIdsToDelete.length} SLO Summary documents from the summary index`
          );

          await this.esClient.deleteByQuery({
            wait_for_completion: false,
            index: SUMMARY_DESTINATION_INDEX_PATTERN,
            query: {
              bool: {
                should: getDeleteQueryFilter(sloSummaryIdsToDelete.sort()),
              },
            },
          });
        }
      } while (searchAfterKey);
    }
  };

  fetchSloSummariesIds = async (
    searchAfter?: AggregationsCompositeAggregateKey
  ): Promise<{
    searchAfter?: AggregationsCompositeAggregateKey;
    sloSummaryIds: Array<{ id: string; revision: number }>;
  }> => {
    this.logger.debug(`[TASK] Fetching SLO Summary ids after ${searchAfter}`);
    if (!this.esClient) {
      return {
        searchAfter: undefined,
        sloSummaryIds: [],
      };
    }

    const size = 1000;

    const result = await this.esClient.search<
      unknown,
      {
        slos: {
          after_key: AggregationsCompositeAggregateKey;
          buckets: Array<{
            key: {
              id: string;
              revision: number;
            };
          }>;
        };
      }
    >({
      size: 0,
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      aggs: {
        slos: {
          composite: {
            size,
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
    });

    const aggBuckets = result.aggregations?.slos.buckets ?? [];
    if (aggBuckets.length === 0) {
      return {
        searchAfter: undefined,
        sloSummaryIds: [],
      };
    }

    const newSearchAfter =
      aggBuckets.length < size ? undefined : result.aggregations?.slos.after_key;

    const sloSummaryIds = aggBuckets.map(({ key }) => {
      return {
        id: String(key.id),
        revision: Number(key.revision),
      };
    });

    return {
      searchAfter: newSearchAfter,
      sloSummaryIds,
    };
  };

  findSloDefinitions = async (ids: string[]) => {
    const sloDefinitions = await this.soClient?.find<Pick<StoredSLODefinition, 'id' | 'revision'>>({
      type: SO_SLO_TYPE,
      page: 1,
      perPage: ids.length,
      filter: `slo.attributes.id:(${ids.join(' or ')})`,
      namespaces: [ALL_SPACES_ID],
      fields: ['id', 'revision'],
    });

    return sloDefinitions?.saved_objects.map(({ attributes }) => attributes) ?? [];
  };

  private get taskId() {
    return `${TASK_TYPE}:1.0.0`;
  }

  public async start(
    taskManager: TaskManagerStartContract,
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient
  ) {
    this.taskManager = taskManager;
    this.soClient = soClient;
    this.esClient = esClient;

    if (!taskManager) {
      this.logger.info(
        'Missing required service during startup, skipping orphan-slo-summary-cleanup task.'
      );
      return;
    }

    if (this.config.sloOrphanSummaryCleanUpTaskEnabled) {
      await this.taskManager.ensureScheduled({
        id: this.taskId,
        taskType: TASK_TYPE,
        schedule: {
          interval: '1h',
        },
        scope: ['observability', 'slo'],
        state: {},
        params: {},
      });
    } else {
      await this.taskManager.removeIfExists(this.taskId);
    }
  }
}
