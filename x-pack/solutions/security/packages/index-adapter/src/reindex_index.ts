/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { parseEsInterval } from './parse_es_interval';
import { retryTransientEsErrors } from './retry_transient_es_errors';

export interface ReindexIndexDocumentsParams {
  esClient: ElasticsearchClient;
  logger: Logger;
  indexName: string;
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
 * Creates a new index with updated mappings and reindexes documents from the old index
 * This is useful when updating inference_id properties of semantic_text fields
 */
export async function reindexIndexDocuments({
  esClient,
  logger,
  indexName,
  batchSize = 1000,
  timeout = '10m',
  reindexTimeout = '10m',
}: ReindexIndexDocumentsParams): Promise<void> {
  logger.info(`Starting reindex of documents in index: ${indexName}`);

  try {
    // Check for existing reindex tasks to prevent concurrent operations
    const activeTasks = await getActiveReindexTasks({ esClient, logger, indexName });
    if (activeTasks.length > 0) {
      throw new Error(
        `A reindex operation is already in progress for index ${indexName}. Please wait for it to complete.`
      );
    }

    // Check if index exists
    const indexExists = await retryTransientEsErrors(
      () => esClient.indices.exists({ index: indexName }),
      { logger }
    );

    if (!indexExists) {
      throw new Error(`Index ${indexName} does not exist`);
    }

    // Get current index settings and mappings
    const indexInfo = await retryTransientEsErrors(
      () => esClient.indices.get({ index: indexName }),
      { logger }
    );

    const currentIndex = indexInfo[indexName];
    if (!currentIndex) {
      throw new Error(`Could not retrieve information for index ${indexName}`);
    }

    // Create temporary index name
    const tempIndexName = `${indexName}-reindex-${Date.now()}`;

    // Create new index with updated mappings from template
    await createIndexWithUpdatedMappings({
      esClient,
      logger,
      sourceIndexName: indexName,
      tempIndexName,
    });

    // Reindex documents to the new index
    await performReindex({
      esClient,
      logger,
      sourceIndex: indexName,
      targetIndex: tempIndexName,
      batchSize,
      timeout,
      reindexTimeout,
    });

    // Swap indices atomically using aliases
    await swapIndices({
      esClient,
      logger,
      oldIndexName: indexName,
      newIndexName: tempIndexName,
    });

    logger.info(`Completed reindex of documents in index: ${indexName}`);
  } catch (error) {
    logger.error(`Failed to reindex index ${indexName}: ${error.message}`);
    throw error;
  }
}

/**
 * Creates a new index with updated mappings from the index template
 */
async function createIndexWithUpdatedMappings({
  esClient,
  logger,
  sourceIndexName,
  tempIndexName,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  sourceIndexName: string;
  tempIndexName: string;
}): Promise<void> {
  logger.debug(`Creating temporary index ${tempIndexName} with updated mappings`);

  try {
    // Get simulated mappings from template
    const simulatedMapping = await retryTransientEsErrors(
      () => esClient.indices.simulateIndexTemplate({ name: sourceIndexName }),
      { logger }
    );

    const mappings = simulatedMapping.template?.mappings;
    const settings = simulatedMapping.template?.settings;

    if (!mappings) {
      throw new Error(`No mappings found in template for ${sourceIndexName}`);
    }

    // Create the new index
    await retryTransientEsErrors(
      () =>
        esClient.indices.create({
          index: tempIndexName,
          mappings,
          settings,
        }),
      { logger }
    );

    logger.debug(`Successfully created temporary index ${tempIndexName}`);
  } catch (error) {
    logger.error(`Failed to create temporary index ${tempIndexName}: ${error.message}`);
    throw error;
  }
}

/**
 * Performs the actual reindex operation
 */
async function performReindex({
  esClient,
  logger,
  sourceIndex,
  targetIndex,
  batchSize,
  timeout,
  reindexTimeout,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  sourceIndex: string;
  targetIndex: string;
  batchSize: number;
  timeout: string;
  reindexTimeout: string;
}): Promise<void> {
  logger.debug(`Reindexing from ${sourceIndex} to ${targetIndex}`);

  try {
    const reindexResponse = await retryTransientEsErrors(
      () =>
        esClient.reindex({
          source: {
            index: sourceIndex,
            size: batchSize,
          },
          dest: {
            index: targetIndex,
            op_type: 'create',
          },
          timeout,
          wait_for_completion: false,
          refresh: true,
        }),
      { logger }
    );

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
      targetIndex,
      timeout: reindexTimeout,
    });

    logger.debug(`Successfully reindexed ${sourceIndex} to ${targetIndex}`);
  } catch (error) {
    logger.error(`Failed to reindex ${sourceIndex} to ${targetIndex}: ${error.message}`);

    // Clean up temporary index on failure
    try {
      await esClient.indices.delete({ index: targetIndex, ignore_unavailable: true });
    } catch (cleanupError) {
      logger.warn(`Failed to clean up temporary index ${targetIndex}: ${cleanupError.message}`);
    }

    throw error;
  }
}

/**
 * Swaps the old and new indices using aliases
 */
async function swapIndices({
  esClient,
  logger,
  oldIndexName,
  newIndexName,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  oldIndexName: string;
  newIndexName: string;
}): Promise<void> {
  logger.debug(`Swapping indices: ${oldIndexName} -> ${newIndexName}`);

  try {
    // Get existing aliases for the old index
    const aliasResponse = await retryTransientEsErrors(
      () => esClient.indices.getAlias({ index: oldIndexName }),
      { logger }
    );

    const existingAliases = Object.keys(aliasResponse[oldIndexName]?.aliases || {});

    // Atomically move all aliases from the old index to the new one
    const actions = existingAliases.flatMap((alias) => [
      { remove: { index: oldIndexName, alias } },
      { add: { index: newIndexName, alias } },
    ]);

    // Add the index name itself as an alias to the new index, and remove from the old
    actions.push({ remove: { index: oldIndexName, alias: oldIndexName } });
    actions.push({ add: { index: newIndexName, alias: oldIndexName } });

    await retryTransientEsErrors(() => esClient.indices.updateAliases({ actions }), { logger });

    // Clean up the old index
    try {
      await retryTransientEsErrors(
        () => esClient.indices.delete({ index: oldIndexName, ignore_unavailable: true }),
        { logger }
      );
    } catch (cleanupError) {
      logger.warn(`Failed to clean up old index ${oldIndexName}: ${cleanupError.message}`);
    }

    logger.debug(`Successfully swapped indices`);
  } catch (error) {
    logger.error(`Failed to swap indices: ${error.message}`);
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
  targetIndex,
  timeout,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  taskId: string;
  sourceIndex: string;
  targetIndex: string;
  timeout: string;
}): Promise<void> {
  const timeoutMs = parseEsInterval(timeout);
  const retryInterval = 5000;
  const maxRetries = Math.floor(timeoutMs / retryInterval);

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const taskResponse = await esClient.tasks.get({
        task_id: taskId,
        wait_for_completion: false,
      });

      if (taskResponse.completed) {
        const task = taskResponse.task;

        if (task?.status?.failures && task.status.failures.length > 0) {
          const failures = task.status.failures;
          logger.error(`Reindex task ${taskId} completed with failures:`, failures);
          throw new Error(
            `Reindex from ${sourceIndex} to ${targetIndex} failed with ${failures.length} failures`
          );
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
    } catch (error) {
      if (error.meta?.statusCode === 404) {
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
 * Gets the status of active reindex tasks for an index
 */
export async function getActiveReindexTasks({
  esClient,
  logger,
  indexName,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  indexName: string;
}): Promise<ReindexTaskStatus[]> {
  try {
    const tasksResponse = await esClient.tasks.list({
      detailed: true,
      actions: ['indices:data/write/reindex'],
    });

    const reindexTasks: ReindexTaskStatus[] = [];

    for (const node of Object.values(tasksResponse.nodes ?? {})) {
      for (const [taskId, task] of Object.entries(node.tasks)) {
        if (task.description?.includes(indexName)) {
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
    logger.error(`Failed to get reindex tasks for ${indexName}: ${error.message}`);
    return [];
  }
}
