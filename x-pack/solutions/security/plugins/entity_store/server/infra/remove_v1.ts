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
  taskManager: TaskManagerStartContract;
}

export async function stopAndRemoveV1({
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

  await Promise.all(
    transformIds.map((transformId) =>
      tryAsBoolean(
        esClient.transform.stopTransform(
          { transform_id: transformId, wait_for_completion: true, force: true },
          { ignore: [404, 409] }
        )
      )
    )
  );

  await Promise.all(taskIds.map((taskId) => tryAsBoolean(taskManager.removeIfExists(taskId))));

  await Promise.all([
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

  scopedLogger.debug(`Stopped and removed entity store v1 resources for type: ${type}`);
}

export async function stopAndRemoveV1SharedTasks({
  namespace,
  taskManager,
}: StopAndRemoveV1SharedTasksParams) {
  const taskIds = [
    `entity_store:field_retention:enrichment:${namespace}:1.0.0`,
    `entity_store:data_view:refresh:${namespace}:1.0.0`,
    `entity_store:health:${namespace}:1.0.0`,
  ];
  await Promise.all(taskIds.map((taskId) => tryAsBoolean(taskManager.removeIfExists(taskId))));
}

async function tryAsBoolean(promise: Promise<unknown>): Promise<boolean> {
  try {
    await promise;
    return true;
  } catch {
    return false;
  }
}
