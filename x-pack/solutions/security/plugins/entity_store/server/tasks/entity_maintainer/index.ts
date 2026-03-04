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
import type {
  EntityMaintainerStatus,
  EntityMaintainerTaskMethod,
  RegisterEntityMaintainerConfig,
} from './types';
import { TasksConfig } from '../config';
import { EntityStoreTaskType } from '../constants';
import type { EntityStoreCoreSetup } from '../../types';
import { entityMaintainersRegistry } from './entity_maintainers_registry';

function getTaskType(id: string): string {
  return `${TasksConfig[EntityStoreTaskType.Values.entityMaintainer].type}:${id}`;
}

function getTaskId(id: string, namespace: string): string {
  return `${id}:${namespace}`;
}

export async function scheduleEntityMaintainerTasks({
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
    logger.debug(`Scheduling entity maintainer tasks`);
    const tasks = entityMaintainersRegistry.getAll();
    for (const { id, interval } of tasks) {
      await taskManager.ensureScheduled(
        {
          id: getTaskId(id, namespace),
          taskType: getTaskType(id),
          schedule: { interval },
          state: { namespace },
          params: {},
        },
        { request }
      );
    }
  } catch (err) {
    logger.error(`Failed to schedule entity maintainer tasks: ${err?.message}`);
    throw err;
  }
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

  entityMaintainersRegistry.update({ id, interval });

  void core
    .getStartServices()
    .then(([start]) => {
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

              const maintainerStatus: EntityMaintainerStatus = {
                metadata: {
                  runs: currentStatus?.metadata?.runs || 0,
                  lastSuccessTimestamp: currentStatus?.metadata?.lastSuccessTimestamp || null,
                  lastErrorTimestamp: currentStatus?.metadata?.lastErrorTimestamp || null,
                  namespace: currentStatus?.namespace || currentStatus?.metadata?.namespace,
                },
                state: currentStatus?.metadata?.runs ? currentStatus.state : initialState,
              };

              return await runEntityMaintainerTask({
                currentStatus: maintainerStatus,
                fakeRequest,
                logger: logger.get(taskInstance.id),
                setup,
                run,
                abortController,
                esClient: start.elasticsearch.client.asScoped(fakeRequest).asCurrentUser,
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
}: {
  currentStatus: EntityMaintainerStatus;
  fakeRequest: KibanaRequest;
  logger: Logger;
  setup?: EntityMaintainerTaskMethod;
  run: EntityMaintainerTaskMethod;
  abortController: AbortController;
  esClient: ElasticsearchClient;
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
      });
    }
    logger.debug(`Executing run`);
    currentStatus.state = await run({
      status: { ...currentStatus },
      abortController,
      logger,
      fakeRequest,
      esClient,
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
