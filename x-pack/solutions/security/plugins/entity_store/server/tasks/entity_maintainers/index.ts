/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/logging';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import {
  EntityMaintainerTaskStatus,
  type EntityMaintainerStatus,
  type EntityMaintainerTaskMethod,
  type RegisterEntityMaintainerConfig,
} from './types';
import { TasksConfig } from '../config';
import { EntityStoreTaskType } from '../constants';
import type { EntityStoreCoreSetup } from '../../types';
import { entityMaintainersRegistry } from './entity_maintainers_registry';
import { CRUDClient } from '../../domain/crud_client';

function getTaskType(id: string): string {
  return `${TasksConfig[EntityStoreTaskType.Values.entityMaintainer].type}:${id}`;
}

export function getTaskId(id: string, namespace: string): string {
  return `${id}:${namespace}`;
}

export async function scheduleEntityMaintainerTask({
  logger,
  taskManager,
  id,
  interval,
  namespace,
  request,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  id: string;
  interval: string;
  namespace: string;
  request: KibanaRequest;
}): Promise<void> {
  logger.debug(`Scheduling entity maintainer task: ${id}`);
  await taskManager.ensureScheduled(
    {
      id: getTaskId(id, namespace),
      taskType: getTaskType(id),
      schedule: { interval },
      state: { namespace, taskStatus: EntityMaintainerTaskStatus.STARTED },
      params: {},
    },
    { request }
  );
}

export function registerEntityMaintainerTask({
  taskManager,
  logger,
  config,
  core,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  config: RegisterEntityMaintainerConfig;
  core: EntityStoreCoreSetup;
}): void {
  logger.debug(`Registering entity maintainer task: ${config.id}`);
  const { title } = TasksConfig[EntityStoreTaskType.Values.entityMaintainer];
  const { run, interval, initialState, description, id, setup } = config;
  const type = getTaskType(id);

  void core
    .getStartServices()
    .then(([start]) => {
      entityMaintainersRegistry.register({
        id,
        interval,
        description,
      });

      taskManager.registerTaskDefinitions({
        [type]: {
          title,
          description,
          createTaskRunner: ({ taskInstance, abortController, fakeRequest }) => ({
            run: async () => {
              const currentStatus = taskInstance.state;

              if (!fakeRequest) {
                logger.error(`No fake request found, skipping run`);

                return {
                  state: currentStatus,
                };
              }

              if (currentStatus.taskStatus === EntityMaintainerTaskStatus.STOPPED) {
                logger.debug(`Entity maintainer task is stopped, skipping run`);
                return {
                  state: currentStatus,
                };
              }

              const maintainerStatus: EntityMaintainerStatus = {
                metadata: {
                  runs: currentStatus?.metadata?.runs || 0,
                  lastSuccessTimestamp: currentStatus?.metadata?.lastSuccessTimestamp || null,
                  lastErrorTimestamp: currentStatus?.metadata?.lastErrorTimestamp || null,
                  namespace: currentStatus?.namespace || currentStatus?.metadata?.namespace,
                },
                state: currentStatus?.metadata?.runs ? currentStatus.state : initialState,
                taskStatus:
                  currentStatus?.taskStatus ?? EntityMaintainerTaskStatus.STARTED,
              };

              const esClient = start.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
              const crudClient = new CRUDClient({
                logger,
                esClient,
                namespace: maintainerStatus.metadata.namespace,
              });

              return await runEntityMaintainerTask({
                currentStatus: maintainerStatus,
                fakeRequest,
                logger: logger.get(taskInstance.id),
                setup,
                run,
                abortController,
                esClient,
                crudClient
              });
            },
          }),
        },
      });
    })
    .catch((err) => {
      logger.error(`Failed to register entity maintainer task: ${err?.message}`);
    });
}

async function runEntityMaintainerTask({
  currentStatus,
  fakeRequest,
  logger,
  setup,
  run,
  abortController,
  esClient,
  crudClient,
}: {
  currentStatus: EntityMaintainerStatus;
  fakeRequest: KibanaRequest;
  logger: Logger;
  setup?: EntityMaintainerTaskMethod;
  run: EntityMaintainerTaskMethod;
  abortController: AbortController;
  esClient: ElasticsearchClient;
  crudClient: CRUDClient;
}): Promise<{ state: EntityMaintainerStatus }> {
  try {
    const isFirstRun = currentStatus.metadata.runs === 0;
    if (isFirstRun && setup) {
      logger.debug(`First run, executing setup`);
      currentStatus.state = await setup({
        status: { ...currentStatus },
        abortController,
        logger,
        fakeRequest,
        esClient,
        crudClient
      });
    }
    logger.debug(`Executing run`);
    currentStatus.state = await run({
      status: { ...currentStatus },
      abortController,
      logger,
      fakeRequest,
      esClient,
      crudClient
    });
    currentStatus.metadata.lastSuccessTimestamp = new Date().toISOString();
  } catch (err) {
    currentStatus.metadata.lastErrorTimestamp = new Date().toISOString();
    logger.debug(`Run failed - ${err?.message}`);
  } finally {
    currentStatus.metadata.runs++;
  }

  return {
    state: currentStatus,
  };
}

async function updateTaskStatus({
  taskManager,
  taskId,
  taskStatus,
  request,
}: {
  taskManager: TaskManagerStartContract;
  taskId: string;
  taskStatus: EntityMaintainerTaskStatus;
  request: KibanaRequest;
}): Promise<void> {
  await taskManager.bulkUpdateState(
    [taskId],
    (state) => ({ ...state, taskStatus }),
    { request }
  );
}

export async function stopEntityMaintainer({
  taskManager,
  id,
  namespace,
  logger,
  request,
}: {
  taskManager: TaskManagerStartContract;
  id: string;
  namespace: string;
  logger: Logger;
  request: KibanaRequest;
}): Promise<void> {
  const taskId = getTaskId(id, namespace);
  await updateTaskStatus({
    taskManager,
    taskId,
    taskStatus: EntityMaintainerTaskStatus.STOPPED,
    request,
  });
  logger.debug(`Stopped entity maintainer task: ${taskId}`);
}

export async function startEntityMaintainer({
  taskManager,
  id,
  namespace,
  logger,
  request,
}: {
  taskManager: TaskManagerStartContract;
  id: string;
  namespace: string;
  logger: Logger;
  request: KibanaRequest;
}): Promise<void> {
  const taskId = getTaskId(id, namespace);
  await updateTaskStatus({
    taskManager,
    taskId,
    taskStatus: EntityMaintainerTaskStatus.STARTED,
    request,
  });
  logger.debug(`Start entity maintainer task: ${taskId}`);
}

export async function removeEntityMaintainer({
  taskManager,
  id,
  namespace,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  id: string;
  namespace: string;
  logger: Logger;
}): Promise<void> {
  const taskId = getTaskId(id, namespace);
  await taskManager.removeIfExists(taskId);
  logger.debug(`Removed entity maintainer task: ${taskId}`);
}
