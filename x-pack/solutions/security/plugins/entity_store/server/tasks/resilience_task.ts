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
import type { KibanaRequest } from '@kbn/core/server';
import { getErrorMessage } from '../../common';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import { createAssetManagerClient } from './factories';
import type { EntityStoreCoreSetup } from '../types';
import { ENTITY_STORE_STATUS } from '../domain/constants';
import { createReportEvent } from '../telemetry/events';
import { wrapTaskRun } from '../telemetry/traces';

const config = TasksConfig[EntityStoreTaskType.enum.resilience];

const getResilienceTaskId = (namespace: string): string => `${config.type}:${namespace}`;

async function runTask({
  taskInstance,
  fakeRequest,
  signal,
  logger,
  core,
}: RunContext & {
  logger: Logger;
  core: EntityStoreCoreSetup;
}): Promise<RunResult> {
  const namespace = taskInstance.state.namespace as string | undefined;

  if (!namespace) {
    throw new Error('Namespace is required for resilience task');
  }

  if (!fakeRequest) {
    logger.error('No fake request found, skipping resilience task');
    return { state: { namespace } };
  }

  const telemetryReporter = createReportEvent(core.analytics);

  const { assetManagerClient } = await createAssetManagerClient({
    core,
    fakeRequest,
    logger,
    namespace,
    analytics: telemetryReporter,
  });

  const { status } = await assetManagerClient.getStatus();
  if (status === ENTITY_STORE_STATUS.NOT_INSTALLED) {
    logger.debug(`Entity store not installed in namespace ${namespace}, skipping resilience check`);
    return { state: { namespace } };
  }

  await assetManagerClient.reinstallSharedAssetsIfMissing();

  return { state: { namespace } };
}

export function registerResilienceTask({
  taskManager,
  logger,
  core,
}: {
  core: EntityStoreCoreSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
}): void {
  try {
    taskManager.registerTaskDefinitions({
      [config.type]: {
        title: config.title,
        timeout: config.timeout,
        maxAttempts: 1,
        createTaskRunner: ({
          taskInstance,
          fakeRequest,
          signal,
          executionUuid,
          setCustomTaskRunEventFields,
        }: RunContext) => ({
          run: () =>
            wrapTaskRun({
              spanName: 'entityStore.task.resilience.run',
              namespace: taskInstance.state.namespace,
              attributes: {
                'entity_store.task.id': taskInstance.id,
              },
              run: () =>
                runTask({
                  taskInstance,
                  fakeRequest,
                  signal,
                  executionUuid,
                  setCustomTaskRunEventFields,
                  logger: logger.get(taskInstance.id),
                  core,
                }),
            }),
        }),
      },
    });
  } catch (e) {
    logger.error(`Error registering resilience task: ${getErrorMessage(e)}`);
    throw e;
  }
}

export async function scheduleResilienceTask({
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
        id: getResilienceTaskId(namespace),
        taskType: config.type,
        schedule: { interval: config.interval },
        state: { namespace },
        params: {},
      },
      { request }
    );
  } catch (e) {
    logger.error(`Error scheduling resilience task: ${getErrorMessage(e)}`);
    throw e;
  }
}

export async function stopResilienceTask({
  taskManager,
  logger,
  namespace,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  namespace: string;
}): Promise<void> {
  const taskId = getResilienceTaskId(namespace);
  await taskManager.removeIfExists(taskId);
  logger.debug(`Removed resilience task: ${taskId}`);
}
