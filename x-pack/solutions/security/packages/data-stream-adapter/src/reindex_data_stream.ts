/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  IndicesGetDataStreamResponse,
  ReindexResponse,
  TasksGetResponse,
  TasksListResponse,
  IndicesDataStreamIndex,
} from '@elastic/elasticsearch/lib/api/types';
import { retryTransientEsErrors } from '@kbn/index-adapter';
import { parseEsInterval } from './parse_es_interval';

export interface ReindexDataStreamDocumentsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  dataStreamName: string;
  batchSize?: number;
  timeout?: string;
  reindexTimeout?: string;
}

export interface ReindexTaskStatus {
  taskId: string;
  completed: boolean;
  error?: unknown;
  total?: number;
  created?: number;
  updated?: number;
  batches?: number;
}

/**
 * Reindexes all older documents in a data stream to apply new mappings
 * This is useful when updating inference_id properties of semantic_text fields
 */
export async function reindexDataStreamDocuments({
  esClient,
  logger,
  dataStreamName,
  batchSize = 1000,
  timeout = '10m',
  reindexTimeout = '10m',
}: ReindexDataStreamDocumentsParams): Promise<void> {
  logger.info(`Starting reindex of older documents in data stream: ${dataStreamName}`);

  try {
    // Check for existing reindex tasks to prevent concurrent operations
    const activeTasks = await getActiveReindexTasks({ esClient, logger, dataStreamName });
    if (activeTasks.length > 0) {
      throw new Error(
        `A reindex operation is already in progress for data stream ${dataStreamName}. Please wait for it to complete.`
      );
    }

    const dataStreamInfo = (await retryTransientEsErrors(
      () => esClient.indices.getDataStream({ name: dataStreamName }),
      { logger }
    )) as IndicesGetDataStreamResponse;

    const dataStream = dataStreamInfo.data_streams[0];
    if (!dataStream) {
      throw new Error(`Data stream ${dataStreamName} not found`);
    }

    const backingIndices = dataStream.indices;
    if (backingIndices.length <= 1) {
      logger.info(
        `Data stream ${dataStreamName} has ${backingIndices.length} backing indices, skipping reindex`
      );
      return;
    }

    // Skip the write index (last one) and reindex older indices
    const indicesToReindex = backingIndices.slice(0, -1);

    logger.info(
      `Reindexing ${indicesToReindex.length} older indices in data stream ${dataStreamName}`
    );

    // Reindex older indices in parallel
    await Promise.all(
      indicesToReindex.map((indexInfo: IndicesDataStreamIndex) => {
        const sourceIndex = indexInfo.index_name;
        return reindexSingleIndex({
          esClient,
          logger,
          sourceIndex,
          targetDataStream: dataStreamName,
          batchSize,
          timeout,
          reindexTimeout,
        });
      })
    );

    logger.info(`Completed reindex of older documents in data stream: ${dataStreamName}`);
  } catch (error) {
    logger.error(`Failed to reindex data stream ${dataStreamName}: ${error.message}`);
    throw error;
  }
}

/**
 * Reindexes a single backing index to the data stream
 */
async function reindexSingleIndex({
  esClient,
  logger,
  sourceIndex,
  targetDataStream,
  batchSize,
  timeout,
  reindexTimeout,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  sourceIndex: string;
  targetDataStream: string;
  batchSize: number;
  timeout: string;
  reindexTimeout: string;
}): Promise<void> {
  logger.debug(`Reindexing from ${sourceIndex} to ${targetDataStream}`);

  try {
    // Start reindex operation
    const reindexResponse = (await retryTransientEsErrors(
      () =>
        esClient.reindex({
          source: {
            index: sourceIndex,
            size: batchSize,
          },
          dest: {
            index: targetDataStream,
            op_type: 'create', // Avoid duplicates
          },
          timeout,
          wait_for_completion: false,
          refresh: true,
        }),
      { logger }
    )) as ReindexResponse;

    const taskId = reindexResponse.task?.toString();
    if (!taskId) {
      throw new Error(`Failed to get task ID for reindex operation from ${sourceIndex}`);
    }

    // Wait for reindex to complete
    await waitForReindexCompletion({
      esClient,
      logger,
      taskId,
      sourceIndex,
      timeout: reindexTimeout,
    });

    logger.debug(`Successfully reindexed ${sourceIndex} to ${targetDataStream}`);
  } catch (error) {
    logger.error(`Failed to reindex ${sourceIndex} to ${targetDataStream}: ${error.message}`);
    throw error;
  }
}

/**
 * Waits for a reindex task to complete and handles errors
 */
async function waitForReindexCompletion({
  esClient,
  logger,
  taskId,
  sourceIndex,
  timeout,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  taskId: string;
  sourceIndex: string;
  timeout: string;
}): Promise<void> {
  const timeoutMs = parseEsInterval(timeout);
  const retryInterval = 5000;
  const maxRetries = Math.floor(timeoutMs / retryInterval);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const taskResponse = (await esClient.tasks.get({
        task_id: taskId,
        wait_for_completion: false,
      })) as TasksGetResponse;

      if (taskResponse.completed) {
        const task = taskResponse.task;

        if (task?.status?.failures && task.status.failures.length > 0) {
          const failures = task.status.failures;
          logger.error(`Reindex task ${taskId} completed with failures:`, failures);
          throw new Error(`Reindex from ${sourceIndex} failed with ${failures.length} failures`);
        }

        const created = task?.status?.created || 0;
        const updated = task?.status?.updated || 0;
        logger.info(`Reindex task ${taskId} completed: ${created} created, ${updated} updated`);
        return;
      }

      // Log progress periodically
      if (attempt % 12 === 0) {
        // Every minute
        const status = taskResponse.task?.status;
        const total = status?.total || 0;
        const processed = (status?.created || 0) + (status?.updated || 0);
        logger.debug(`Reindex task ${taskId} progress: ${processed}/${total} documents`);
      }

      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'meta' in error &&
        (error as { meta: { statusCode?: number } }).meta.statusCode === 404
      ) {
        // Task might have completed and been cleaned up
        logger.warn(`Reindex task ${taskId} not found, assuming completed`);
        return;
      }
      throw error;
    }
  }

  throw new Error(`Reindex task ${taskId} did not complete within the expected time`);
}

/**
 * Gets the status of active reindex tasks for a data stream
 */
export async function getActiveReindexTasks({
  esClient,
  logger,
  dataStreamName,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  dataStreamName: string;
}): Promise<ReindexTaskStatus[]> {
  try {
    const tasksResponse = (await esClient.tasks.list({
      detailed: true,
      actions: ['indices:data/write/reindex'],
    })) as TasksListResponse;

    const reindexTasks: ReindexTaskStatus[] = [];

    for (const node of Object.values(tasksResponse.nodes ?? {})) {
      for (const [taskId, task] of Object.entries(node.tasks)) {
        if (task.description?.includes(dataStreamName)) {
          reindexTasks.push({
            taskId,
            completed: false,
            total: task.status?.total,
            created: task.status?.created,
            updated: task.status?.updated,
            batches: task.status?.batches,
          });
        }
      }
    }

    return reindexTasks;
  } catch (error) {
    logger.error(`Failed to get reindex tasks for ${dataStreamName}: ${error.message}`);
    return [];
  }
}
