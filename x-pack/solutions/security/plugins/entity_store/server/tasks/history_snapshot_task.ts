/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  TaskCost,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/logging';
import type { KibanaRequest } from '@kbn/core/server';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import type { EntityStoreCoreSetup } from '../types';
import { EntityStoreGlobalStateClient } from '../domain/definitions/saved_objects';
import { HistorySnapshotClient } from '../domain/history_snapshot';

const config = TasksConfig[EntityStoreTaskType.enum.historySnapshot];

export const getHistorySnapshotTaskId = (namespace: string): string =>
  `${config.type}:${namespace}`;

interface RunHistorySnapshotTaskParams {
  taskInstance: { state: Record<string, unknown>; id: string };
  abortController: AbortController;
  fakeRequest: KibanaRequest | null | undefined;
  core: EntityStoreCoreSetup;
  logger: Logger;
}

async function runHistorySnapshotTask({
  taskInstance,
  abortController,
  fakeRequest,
  core,
  logger,
}: RunHistorySnapshotTaskParams): Promise<{ state: Record<string, unknown> }> {
  const namespace = taskInstance.state?.namespace as string | undefined;
  if (!namespace) {
    logger.error('History snapshot task missing namespace in state');
    return { state: taskInstance.state };
  }
  if (!fakeRequest) {
    logger.error('No fake request found, skipping history snapshot task');
    return { state: taskInstance.state };
  }

  const [start] = await core.getStartServices();
  const soClient = start.savedObjects.getScopedClient(fakeRequest);
  const esClient = start.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
  const taskLogger = logger.get(taskInstance.id);

  const globalStateClient = new EntityStoreGlobalStateClient(soClient, namespace, taskLogger);
  const historySnapshotClient = new HistorySnapshotClient({
    logger: taskLogger,
    esClient,
    namespace,
    globalStateClient,
  });

  await historySnapshotClient.runHistorySnapshot({
    abortSignal: abortController.signal,
  });

  return { state: taskInstance.state };
}

export function registerHistorySnapshotTask({
  taskManager,
  logger,
  core,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: EntityStoreCoreSetup;
}): void {
  const taskType = config.type;
  taskManager.registerTaskDefinitions({
    [taskType]: {
      title: config.title,
      timeout: config.timeout,
      cost: TaskCost.Normal,
      stateSchemaByVersion: {
        1: {
          up: (state: Record<string, unknown>) => ({
            namespace: typeof state.namespace === 'string' ? state.namespace : 'default',
          }),
          schema: schema.object({
            namespace: schema.string(),
          }),
        },
      },
      createTaskRunner: ({ taskInstance, abortController, fakeRequest }) => ({
        run: () =>
          runHistorySnapshotTask({
            taskInstance,
            abortController,
            fakeRequest,
            core,
            logger,
          }),
      }),
    },
  });
}

export async function scheduleHistorySnapshotTasks({
  logger,
  taskManager,
  namespace,
  request,
  frequency,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  namespace: string;
  request: KibanaRequest;
  frequency: string;
}): Promise<void> {
  try {
    const taskId = getHistorySnapshotTaskId(namespace);
    await taskManager.ensureScheduled(
      {
        id: taskId,
        taskType: config.type,
        schedule: { interval: frequency },
        state: { namespace },
        params: {},
      },
      { request }
    );
    logger.debug(`Scheduled history snapshot task ${taskId} with interval ${frequency}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to schedule history snapshot tasks: ${message}`);
    throw err;
  }
}
