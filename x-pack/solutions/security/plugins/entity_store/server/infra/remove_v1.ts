/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { EntityType } from '../../common';

interface StopAndRemoveV1Params {
  type: EntityType;
  namespace: string;
  logger: Logger;
  esClient: ElasticsearchClient;
  taskManager: TaskManagerStartContract;
  savedObjectsClient: SavedObjectsClientContract;
}

interface StopAndRemoveV1SharedTasksParams {
  namespace: string;
  logger: Logger;
  taskManager: TaskManagerStartContract;
}

const RETRY_ON_FAILURE_TIMES = 3;

export async function stopAndRemoveV1({
  type,
  namespace,
  logger,
  esClient,
  taskManager,
  savedObjectsClient,
}: StopAndRemoveV1Params) {
  const scopedLogger = logger.get(type);
  for (let attempt = 1; attempt <= RETRY_ON_FAILURE_TIMES; attempt++) {
    try {
      await stopAndRemoveV1Once({
        type,
        namespace,
        logger,
        esClient,
        taskManager,
        savedObjectsClient,
      });
      return;
    } catch (error) {
      if (attempt === RETRY_ON_FAILURE_TIMES) {
        throw error;
      }
      scopedLogger.warn(
        `Failed to remove entity store v1 resources for type: ${type}. Retrying (${attempt}/${RETRY_ON_FAILURE_TIMES}).`,
        error
      );
    }
  }
}

async function stopAndRemoveV1Once({
  type,
  namespace,
  logger,
  esClient,
  taskManager,
  savedObjectsClient,
}: StopAndRemoveV1Params) {
  const definitionId = `security_${type}_${namespace}`;
  const scopedLogger = logger.get(type);
  const transformIds = [
    `entities-v1-latest-${definitionId}`,
    `entities-v1-history-${definitionId}`,
  ];
  const taskIds = [`entity_store:snapshot:${type}:${namespace}:1.0.0`];
  const ingestPipelineIds = [
    `entities-v1-latest-${definitionId}`,
    `entities-v1-history-${definitionId}`,
    `${definitionId}-latest@platform`,
  ];
  const indexTemplateIds = [
    `entities_v1_reset_${definitionId}_index_template`,
    `entities_v1_updates_${definitionId}_index_template`,
  ];
  const componentTemplateIds = [
    `${definitionId}-updates@platform`,
    `${definitionId}-updates@custom`,
  ];
  const resetIndex = `.entities.v1.reset.${definitionId}`;
  const updatesDataStream = `.entities.v1.updates.${definitionId}`;
  const enrichPolicyName = `entity_store_field_retention_${type}_${namespace}_v1.0.0`;
  const v1EngineDescriptorId = `entity-engine-descriptor-${type}-${namespace}`;

  const stoppedTransforms = await Promise.all(
    transformIds.map((transformId) =>
      tryAsBoolean(
        esClient.transform.stopTransform(
          { transform_id: transformId, wait_for_completion: true, force: true },
          { ignore: [404, 409] }
        )
      )
    )
  );
  if (stoppedTransforms.includes(false)) {
    throw new Error(`Failed to stop one or more entity store v1 transforms for type: ${type}`);
  }

  const removedTasks = await Promise.all(
    taskIds.map((taskId) => tryAsBoolean(taskManager.removeIfExists(taskId)))
  );
  if (removedTasks.includes(false)) {
    throw new Error(`Failed to remove one or more entity store v1 tasks for type: ${type}`);
  }

  const removedResources = await Promise.all([
    ...transformIds.map((transformId) =>
      tryAsBoolean(
        esClient.transform.deleteTransform(
          { transform_id: transformId, force: true },
          { ignore: [404] }
        )
      )
    ),
    ...ingestPipelineIds.map((pipelineId) =>
      tryAsBoolean(esClient.ingest.deletePipeline({ id: pipelineId }, { ignore: [404] }))
    ),
    ...indexTemplateIds.map((templateId) =>
      tryAsBoolean(esClient.indices.deleteIndexTemplate({ name: templateId }, { ignore: [404] }))
    ),
    ...componentTemplateIds.map((componentTemplateId) =>
      tryAsBoolean(
        esClient.cluster.deleteComponentTemplate({ name: componentTemplateId }, { ignore: [404] })
      )
    ),
    tryAsBoolean(esClient.enrich.deletePolicy({ name: enrichPolicyName }, { ignore: [404] })),
    tryAsBoolean(esClient.indices.delete({ index: resetIndex }, { ignore: [404] })),
    tryAsBoolean(esClient.indices.deleteDataStream({ name: updatesDataStream }, { ignore: [404] })),
    tryAsBoolean(
      savedObjectsClient.delete('entity-definition', definitionId).catch((error) => {
        if (
          SavedObjectsErrorHelpers.isNotFoundError(error) ||
          SavedObjectsErrorHelpers.isForbiddenError(error)
        ) {
          return;
        }
        throw error;
      })
    ),
    tryAsBoolean(
      savedObjectsClient.delete('entity-engine-status', v1EngineDescriptorId).catch((error) => {
        if (
          SavedObjectsErrorHelpers.isNotFoundError(error) ||
          SavedObjectsErrorHelpers.isForbiddenError(error)
        ) {
          return;
        }
        throw error;
      })
    ),
  ]);
  if (removedResources.includes(false)) {
    throw new Error(`Failed to remove one or more entity store v1 resources for type: ${type}`);
  }

  scopedLogger.debug(`Stopped and removed entity store v1 resources for type: ${type}`);
}

export async function stopAndRemoveV1SharedTasks({
  namespace,
  logger,
  taskManager,
}: StopAndRemoveV1SharedTasksParams) {
  for (let attempt = 1; attempt <= RETRY_ON_FAILURE_TIMES; attempt++) {
    try {
      await stopAndRemoveV1SharedTasksOnce({ namespace, logger, taskManager });
      return;
    } catch (error) {
      if (attempt === RETRY_ON_FAILURE_TIMES) {
        throw error;
      }
      logger.warn(
        `Failed to remove shared entity store v1 tasks in namespace: ${namespace}. Retrying (${attempt}/${RETRY_ON_FAILURE_TIMES}).`,
        error
      );
    }
  }
}

async function stopAndRemoveV1SharedTasksOnce({
  namespace,
  taskManager,
}: StopAndRemoveV1SharedTasksParams) {
  const taskIds = [
    `entity_store:field_retention:enrichment:${namespace}:1.0.0`,
    `entity_store:data_view:refresh:${namespace}:1.0.0`,
    `entity_store:health:${namespace}:1.0.0`,
  ];
  const removedTasks = await Promise.all(
    taskIds.map((taskId) => tryAsBoolean(taskManager.removeIfExists(taskId)))
  );
  if (removedTasks.includes(false)) {
    throw new Error(
      `Failed to remove one or more shared entity store v1 tasks in namespace: ${namespace}`
    );
  }
}

async function tryAsBoolean(promise: Promise<unknown>): Promise<boolean> {
  try {
    await promise;
    return true;
  } catch {
    return false;
  }
}
