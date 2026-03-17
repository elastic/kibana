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
  EntityMaintainerTelemetryEventType,
  type EntityMaintainerStatus,
  type EntityMaintainerTaskMethod,
  type RegisterEntityMaintainerConfig,
} from './types';
import { TasksConfig } from '../config';
import { EntityStoreTaskType } from '../constants';
import type { EntityStoreCoreSetup } from '../../types';
import { entityMaintainersRegistry } from './entity_maintainers_registry';
import { CRUDClient } from '../../domain/crud';
import type { TelemetryReporter } from '../../telemetry/events';
import { ENTITY_MAINTAINER_EVENT } from '../../telemetry/events';
import { wrapTaskRun } from '../../telemetry/traces';

function getTaskType(id: string): string {
  return `${TasksConfig[EntityStoreTaskType.enum.entityMaintainer].type}:${id}`;
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
  analytics,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  config: RegisterEntityMaintainerConfig;
  core: EntityStoreCoreSetup;
  analytics: TelemetryReporter;
}): void {
  logger.debug(`Registering entity maintainer task: ${config.id}`);
  const { title } = TasksConfig[EntityStoreTaskType.enum.entityMaintainer];
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
                taskStatus: currentStatus?.taskStatus ?? EntityMaintainerTaskStatus.STARTED,
              };

              const esClient = start.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
              const crudClient = new CRUDClient({
                logger,
                esClient,
                namespace: maintainerStatus.metadata.namespace,
              });
              const taskLogger = logger.get(taskInstance.id);

              return await wrapTaskRun({
                spanName: 'entityStore.task.entity_maintainer.run',
                namespace: currentStatus?.namespace || currentStatus?.metadata?.namespace || '',
                attributes: {
                  'entity_store.task.id': taskInstance.id,
                  'entity_store.task.type': type,
                  'entity_store.entity_maintainer.id': id,
                },
                run: () =>
                  runEntityMaintainerTask({
                    currentStatus: maintainerStatus,
                    fakeRequest,
                    logger: taskLogger,
                    setup,
                    run,
                    abortController,
                    esClient,
                    crudClient,
                    id,
                    analytics,
                  }),
              });
            },
          }),
        },
      });
    })
    .catch((err) => {
      logger.error(`Failed to register entity maintainer task: ${err?.message}`);
    });
  analytics.reportEvent(ENTITY_MAINTAINER_EVENT, {
    id,
    type: EntityMaintainerTelemetryEventType.REGISTER,
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
  id,
  analytics,
}: {
  currentStatus: EntityMaintainerStatus;
  fakeRequest: KibanaRequest;
  logger: Logger;
  setup?: EntityMaintainerTaskMethod;
  run: EntityMaintainerTaskMethod;
  abortController: AbortController;
  esClient: ElasticsearchClient;
  crudClient: CRUDClient;
  id: string;
  analytics: TelemetryReporter;
}): Promise<{ state: EntityMaintainerStatus }> {
  const namespace = currentStatus.metadata.namespace;
  const onAbort = () => {
    logger.debug(`Abort signal received, stopping Entity Maintainer`);
    analytics.reportEvent(ENTITY_MAINTAINER_EVENT, {
      id,
      namespace,
      type: EntityMaintainerTelemetryEventType.ABORT,
    });
  };
  try {
    abortController.signal.addEventListener('abort', onAbort);
    const isFirstRun = currentStatus.metadata.runs === 0;
    if (isFirstRun && setup) {
      logger.debug(`First run, executing setup`);
      currentStatus.state = await setup({
        status: { ...currentStatus },
        abortController,
        logger,
        fakeRequest,
        esClient,
        crudClient,
      });
      analytics.reportEvent(ENTITY_MAINTAINER_EVENT, {
        id,
        namespace,
        type: EntityMaintainerTelemetryEventType.SETUP,
      });
    }
    logger.debug(`Executing run`);
    currentStatus.state = await run({
      status: { ...currentStatus },
      abortController,
      logger,
      fakeRequest,
      esClient,
      crudClient,
    });
    analytics.reportEvent(ENTITY_MAINTAINER_EVENT, {
      id,
      namespace,
      type: EntityMaintainerTelemetryEventType.RUN,
    });
    currentStatus.metadata.lastSuccessTimestamp = new Date().toISOString();
  } catch (err) {
    currentStatus.metadata.lastErrorTimestamp = new Date().toISOString();
    logger.debug(`Run failed - ${err?.message}`);
    analytics.reportEvent(ENTITY_MAINTAINER_EVENT, {
      id,
      namespace,
      type: EntityMaintainerTelemetryEventType.ERROR,
      errorMessage: err?.message?.substring(0, 500), // limit error message length to prevent excessively long strings in telemetry
    });
  } finally {
    currentStatus.metadata.runs++;
    abortController.signal.removeEventListener('abort', onAbort);
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
  await taskManager.bulkUpdateState([taskId], (state) => ({ ...state, taskStatus }), { request });
}

export async function stopEntityMaintainer({
  taskManager,
  id,
  namespace,
  logger,
  request,
  analytics,
}: {
  taskManager: TaskManagerStartContract;
  id: string;
  namespace: string;
  logger: Logger;
  request: KibanaRequest;
  analytics: TelemetryReporter;
}): Promise<void> {
  const taskId = getTaskId(id, namespace);
  await updateTaskStatus({
    taskManager,
    taskId,
    taskStatus: EntityMaintainerTaskStatus.STOPPED,
    request,
  });
  analytics.reportEvent(ENTITY_MAINTAINER_EVENT, {
    id,
    namespace,
    type: EntityMaintainerTelemetryEventType.STOP,
  });
  logger.debug(`Stopped entity maintainer task: ${taskId}`);
}

export async function startEntityMaintainer({
  taskManager,
  id,
  namespace,
  logger,
  request,
  analytics,
}: {
  taskManager: TaskManagerStartContract;
  id: string;
  namespace: string;
  logger: Logger;
  request: KibanaRequest;
  analytics: TelemetryReporter;
}): Promise<void> {
  const taskId = getTaskId(id, namespace);
  await updateTaskStatus({
    taskManager,
    taskId,
    taskStatus: EntityMaintainerTaskStatus.STARTED,
    request,
  });
  analytics.reportEvent(ENTITY_MAINTAINER_EVENT, {
    id,
    namespace,
    type: EntityMaintainerTelemetryEventType.START,
  });
  logger.debug(`Start entity maintainer task: ${taskId}`);
}

export async function removeEntityMaintainer({
  taskManager,
  id,
  namespace,
  logger,
  analytics,
}: {
  taskManager: TaskManagerStartContract;
  id: string;
  namespace: string;
  logger: Logger;
  analytics: TelemetryReporter;
}): Promise<void> {
  const taskId = getTaskId(id, namespace);
  await taskManager.removeIfExists(taskId);
  analytics.reportEvent(ENTITY_MAINTAINER_EVENT, {
    id,
    namespace,
    type: EntityMaintainerTelemetryEventType.DELETE,
  });
  logger.debug(`Removed entity maintainer task: ${taskId}`);
}
