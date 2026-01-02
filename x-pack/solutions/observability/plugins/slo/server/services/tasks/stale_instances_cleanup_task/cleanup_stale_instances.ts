/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger, SavedObjectsClient } from '@kbn/core/server';
import { omit } from 'lodash';
import {
  DEFAULT_STALE_SLO_THRESHOLD_HOURS,
  SUMMARY_DESTINATION_INDEX_PATTERN,
} from '../../../../common/constants';
import type { StoredSLOSettings } from '../../../domain/models';
import { sloSettingsObjectId, SO_SLO_SETTINGS_TYPE } from '../../../saved_objects/slo_settings';
import type { QueryContainer, SpaceSloSettings, TaskState } from './types';

interface Dependencies {
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClient;
  logger: Logger;
  abortController: AbortController;
}

const SPACES_PER_BATCH = 100;
const MAX_BATCHES_PER_RUN = 10;
const MAX_DOCS_PER_DELETE = 1_000_000;
const REQUESTS_PER_SECOND = 300;

export async function cleanupStaleInstances(
  previousState: TaskState,
  dependencies: Dependencies
): Promise<{ nextState: TaskState }> {
  const { logger } = dependencies;
  let { searchAfter, deleteTaskId } = previousState;

  try {
    if (deleteTaskId) {
      const isRunning = await isTaskRunning(deleteTaskId, dependencies);
      if (isRunning) {
        logger.debug(`Previous delete task ${deleteTaskId} still running, skipping this run`);
        return { nextState: { searchAfter, deleteTaskId } };
      }
      logger.debug(`Previous delete task ${deleteTaskId} completed`);
      deleteTaskId = undefined;
    }

    let batchesProcessed = 0;

    while (batchesProcessed < MAX_BATCHES_PER_RUN) {
      const { spaceIds, nextSearchAfter } = await getNextSpaceBatch(searchAfter, dependencies);

      if (spaceIds.length === 0) {
        logger.debug('No more spaces to process, resetting cursor for next full pass');
        return { nextState: {} };
      }

      logger.debug(`Processing batch ${batchesProcessed + 1}: ${spaceIds.length} spaces`);

      const enabledSettings = await getEnabledSpaceSettings(spaceIds, dependencies);

      if (enabledSettings.length === 0) {
        logger.debug('All spaces in batch have cleanup disabled, moving to next batch');
        searchAfter = nextSearchAfter;
        batchesProcessed++;

        if (spaceIds.length < SPACES_PER_BATCH) {
          logger.debug('Reached end of spaces, resetting cursor');
          return { nextState: {} };
        }
        continue;
      }

      const query = buildDeleteQuery(enabledSettings);

      const hasStaleDocuments = await hasDocumentsToDelete(query, dependencies);

      if (!hasStaleDocuments) {
        logger.debug('No stale documents in batch, moving to next batch');
        searchAfter = nextSearchAfter;
        batchesProcessed++;

        if (spaceIds.length < SPACES_PER_BATCH) {
          logger.debug('Reached end of spaces with no stale documents, resetting cursor');
          return { nextState: {} };
        }
        continue;
      }

      deleteTaskId = await executeDeleteByQuery(query, dependencies);
      const isLastBatch = spaceIds.length < SPACES_PER_BATCH;

      logger.debug(
        `Started stale instances deletion for ${enabledSettings.length} spaces. ` +
          `TaskId: ${deleteTaskId}, cursor: ${isLastBatch ? 'reset' : nextSearchAfter}`
      );

      return {
        nextState: {
          searchAfter: isLastBatch ? undefined : nextSearchAfter,
          deleteTaskId,
        },
      };
    }

    logger.debug(`Processed ${batchesProcessed} batches without stale documents, pausing`);
    return {
      nextState: {
        searchAfter,
      },
    };
  } catch (error) {
    if (error instanceof errors.RequestAbortedError) {
      logger.debug('Task aborted, saving progress for next run');
      return {
        nextState: {
          searchAfter,
          deleteTaskId,
        },
      };
    }

    throw error;
  }
}

async function isTaskRunning(taskId: string, dependencies: Dependencies): Promise<boolean> {
  const { esClient, logger, abortController } = dependencies;
  try {
    const response = await esClient.tasks.get(
      { task_id: taskId },
      { signal: abortController.signal }
    );
    // TODO handle long running task? cancel it?
    return !response.completed;
  } catch (error) {
    if (error instanceof errors.RequestAbortedError) {
      throw error;
    }

    if (error?.meta?.statusCode === 404) {
      return false;
    }

    logger.debug(`Failed to check task status for ${taskId}: ${error.message}`);
    return false;
  }
}

async function getNextSpaceBatch(
  searchAfter: string | undefined,
  dependencies: Dependencies
): Promise<{ spaceIds: string[]; nextSearchAfter?: string }> {
  const { esClient, abortController } = dependencies;
  const response = await esClient.search(
    {
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      size: 0,
      aggs: {
        spaces: {
          composite: {
            size: SPACES_PER_BATCH,
            sources: [{ spaceId: { terms: { field: 'spaceId' } } }],
            ...(searchAfter && { after: { spaceId: searchAfter } }),
          },
        },
      },
    },
    { signal: abortController.signal }
  );

  const agg = response.aggregations?.spaces as {
    buckets: Array<{ key: { spaceId: string } }>;
    after_key?: { spaceId: string };
  };

  return {
    spaceIds: agg?.buckets?.map((b) => b.key.spaceId) ?? [],
    nextSearchAfter: agg?.after_key?.spaceId,
  };
}

function buildDeleteQuery(settings: SpaceSloSettings[]): QueryContainer {
  const byThreshold = settings.reduce((acc, setting) => {
    const spaces = acc[setting.staleThresholdInHours] || [];
    spaces.push(setting.spaceId);
    acc[setting.staleThresholdInHours] = spaces;
    return acc;
  }, {} as Record<number, string[]>);

  const shouldClauses = Object.entries(byThreshold).map(([thresholdHours, spaceIds]) => {
    return {
      bool: {
        filter: [
          { terms: { spaceId: spaceIds } },
          { range: { summaryUpdatedAt: { lt: `now-${thresholdHours}h` } } },
        ],
      },
    };
  });

  return {
    bool: {
      should: shouldClauses,
      minimum_should_match: 1,
    },
  };
}

async function hasDocumentsToDelete(
  query: QueryContainer,
  dependencies: Dependencies
): Promise<boolean> {
  const { esClient, abortController } = dependencies;
  const response = await esClient.count(
    { index: SUMMARY_DESTINATION_INDEX_PATTERN, terminate_after: 1, query },
    { signal: abortController.signal }
  );

  return response.count > 0;
}

async function executeDeleteByQuery(
  query: QueryContainer,
  dependencies: Dependencies
): Promise<string | undefined> {
  const { esClient, logger, abortController } = dependencies;
  const response = await esClient.deleteByQuery(
    {
      index: SUMMARY_DESTINATION_INDEX_PATTERN,
      wait_for_completion: false,
      conflicts: 'proceed',
      slices: 'auto',
      max_docs: MAX_DOCS_PER_DELETE,
      requests_per_second: REQUESTS_PER_SECOND,
      query,
    },
    { signal: abortController.signal }
  );

  const taskId = 'task' in response ? response.task : undefined;
  if (taskId) {
    logger.debug(`Started deleteByQuery task: ${taskId}`);
  }

  return taskId;
}

async function getEnabledSpaceSettings(
  spaceIds: string[],
  dependencies: Dependencies
): Promise<SpaceSloSettings[]> {
  const { soClient, logger } = dependencies;

  const settingsObjects = spaceIds.map((id) => ({
    type: SO_SLO_SETTINGS_TYPE,
    id: sloSettingsObjectId(id),
    spaceId: id,
  }));

  let response;
  try {
    response = await soClient.bulkGet<StoredSLOSettings>(omit(settingsObjects, 'spaceId'));
  } catch (error) {
    logger.debug(`Failed to fetch space settings, using none: ${error}`);
    return [];
  }

  const enabledSettings: SpaceSloSettings[] = [];

  for (const result of response.saved_objects) {
    const spaceId = settingsObjects.find((obj) => obj.id === result.id)?.spaceId ?? 'default';
    if (result.error) {
      logger.debug(`Skipping space '${spaceId}': no settings found`);
      continue;
    }

    const settings = result.attributes;
    if (settings.staleInstancesCleanupEnabled !== true) {
      logger.debug(`Skipping space '${spaceId}': stale instances cleanup disabled`);
      continue;
    }

    enabledSettings.push({
      spaceId,
      staleThresholdInHours:
        typeof settings.staleThresholdInHours === 'number'
          ? settings.staleThresholdInHours
          : DEFAULT_STALE_SLO_THRESHOLD_HOURS,
    });
  }

  return enabledSettings;
}
