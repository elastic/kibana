/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { RunContext, RunResult } from '@kbn/task-manager-plugin/server/task';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import type { EntityStoreCoreSetup } from '../types';
import type { EntityType } from '../../common/domain/definitions/entity_schema';
import { ALL_ENTITY_TYPES } from '../../common/domain/definitions/entity_schema';
import { getLatestEntitiesIndexName } from '../domain/asset_manager/latest_index';
import {
  ENTITY_STORE_USAGE_EVENT,
  createReportEvent,
  type TelemetryReporter,
} from '../telemetry/events';

const config = TasksConfig[EntityStoreTaskType.enum.storeUsage];

const getStoreUsageTaskId = (namespace: string): string => `${config.type}:${namespace}`;

const getStoreSize = (esClient: ElasticsearchClient, index: string, entityType: EntityType) =>
  esClient.count({
    index,
    query: { term: { 'entity.EngineMetadata.Type': entityType } },
  });

async function runTask({
  taskInstance,
  fakeRequest,
  logger,
  core,
  reportEvent,
}: RunContext & {
  logger: Logger;
  core: EntityStoreCoreSetup;
  reportEvent: TelemetryReporter['reportEvent'];
}): Promise<RunResult> {
  const namespace = taskInstance.state.namespace as string;

  if (!fakeRequest) {
    logger.error('No fake request found, skipping store usage task');
    return { state: { namespace } };
  }

  try {
    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
    const index = getLatestEntitiesIndexName(namespace);

    for (const entityType of ALL_ENTITY_TYPES) {
      try {
        const { count: storeSize } = await getStoreSize(esClient, index, entityType);
        reportEvent(ENTITY_STORE_USAGE_EVENT, { storeSize, entityType, namespace });
      } catch (e) {
        logger.error(`Error reporting store usage for ${entityType}: ${e.message}`);
      }
    }
  } catch (e) {
    logger.error(`Error running store usage task: ${e.message}`);
  }

  return { state: { namespace } };
}

export function registerStoreUsageTask({
  taskManager,
  logger,
  core,
}: {
  core: EntityStoreCoreSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}): void {
  try {
    const { reportEvent } = createReportEvent(core.analytics);
    taskManager.registerTaskDefinitions({
      [config.type]: {
        title: config.title,
        timeout: config.timeout,
        createTaskRunner: ({ taskInstance, fakeRequest, abortController }) => ({
          run: () =>
            runTask({
              taskInstance,
              fakeRequest,
              abortController,
              logger: logger.get(taskInstance.id),
              core,
              reportEvent,
            }),
        }),
      },
    });
  } catch (e) {
    logger.error(`Error registering store usage task: ${e.message}`);
    throw e;
  }
}

export async function scheduleStoreUsageTask({
  logger,
  taskManager,
  namespace,
  request,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  namespace: string;
  request: KibanaRequest;
}): Promise<void> {
  try {
    await taskManager.ensureScheduled(
      {
        id: getStoreUsageTaskId(namespace),
        taskType: config.type,
        schedule: { interval: config.interval },
        state: { namespace },
        params: {},
      },
      { request }
    );
  } catch (e) {
    logger.error(`Error scheduling store usage task: ${e.message}`);
    throw e;
  }
}

export async function stopStoreUsageTask({
  taskManager,
  logger,
  namespace,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  namespace: string;
}): Promise<void> {
  const taskId = getStoreUsageTaskId(namespace);
  await taskManager.removeIfExists(taskId);
  logger.debug(`Removed store usage task: ${taskId}`);
}
