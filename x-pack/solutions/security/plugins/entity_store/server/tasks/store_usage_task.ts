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
import type { RunResult } from '@kbn/task-manager-plugin/server/task';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import type { EntityStoreCoreSetup } from '../types';
import type { EntityType } from '../../common/domain/definitions/entity_schema';
import { ALL_ENTITY_TYPES } from '../../common/domain/definitions/entity_schema';
import { getLatestEntitiesIndexName } from '../domain/assets/latest_index';
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
}: {
  taskInstance: { state: Record<string, unknown> };
  fakeRequest?: KibanaRequest;
  logger: Logger;
  core: EntityStoreCoreSetup;
  reportEvent: TelemetryReporter;
}): Promise<RunResult> {
  logger.info('Running store usage task');

  const currentState = taskInstance.state;
  const runs = (currentState.runs as number) || 0;
  const namespace = currentState.namespace as string;

  if (!fakeRequest) {
    logger.error('No fake request found, skipping store usage task');
    return { state: { ...currentState } };
  }

  try {
    const [coreStart] = await core.getStartServices();
    const esClient = coreStart.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
    const index = getLatestEntitiesIndexName(namespace);

    await Promise.all(
      ALL_ENTITY_TYPES.map(async (entityType) => {
        const { count: storeSize } = await getStoreSize(esClient, index, entityType);
        reportEvent(ENTITY_STORE_USAGE_EVENT, { storeSize, entityType, namespace });
        logger.debug(`Reported store usage for ${entityType}: ${storeSize} entities`);
      })
    );

    return {
      state: {
        namespace,
        lastExecutionTimestamp: new Date().toISOString(),
        runs: runs + 1,
        status: 'success',
      },
    };
  } catch (e) {
    logger.error(`Error running store usage task: ${e.message}`);
    return {
      state: {
        ...currentState,
        lastError: e.message,
        lastErrorTimestamp: new Date().toISOString(),
        status: 'error',
      },
    };
  }
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
  const reportEvent = createReportEvent(core.analytics);
  try {
    taskManager.registerTaskDefinitions({
      [config.type]: {
        title: config.title,
        timeout: config.timeout,
        createTaskRunner: ({ taskInstance, fakeRequest }) => ({
          run: () =>
            runTask({
              taskInstance,
              fakeRequest,
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
    const taskId = getStoreUsageTaskId(namespace);
    await taskManager.ensureScheduled(
      {
        id: taskId,
        taskType: config.type,
        schedule: { interval: config.interval! },
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
