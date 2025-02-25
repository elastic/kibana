/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


import type { Logger, AnalyticsServiceSetup } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server';

import type { ExperimentalFeatures } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';

import { TYPE, VERSION, TIMEOUT, SCOPE, INTERVAL } from './constants';
import { defaultState, stateSchemaByVersion } from './state';

interface RegisterParams {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  taskManager: TaskManagerSetupContract | undefined;
  experimentalFeatures: ExperimentalFeatures;
  kibanaVersion: string;
}

interface RunParams {
  isCancelled: () => boolean;
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  experimentalFeatures: ExperimentalFeatures;
  taskInstance: ConcreteTaskInstance;
}

interface StartParams {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}

const getTaskName = (): string => TYPE;

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

export const registerPrivilegeMonitoringTask = ({
  getStartServices,
  logger,
  telemetry,
  taskManager,
  kibanaVersion,
  experimentalFeatures,
}: RegisterParams): void => {
  console.log(`registering GREAT SUCCESS`);
  if (!taskManager) {
    logger.info(
      '[Privilege Monitoring]  Task Manager is unavailable; skipping privilege monitoring task registration.'
    );
    return;
  }

  taskManager.registerTaskDefinitions({
    [getTaskName()]: {
      title: 'Entity Analytics Privilege Monitoring - Great Success',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createPrivilegeMonitoringTaskRunnerFactory({
        logger,
        telemetry,
        experimentalFeatures,
      }),
    },
  });
};

const createPrivilegeMonitoringTaskRunnerFactory =
  (deps: {
    logger: Logger;
    telemetry: AnalyticsServiceSetup;
    experimentalFeatures: ExperimentalFeatures;
  }): TaskRunCreatorFunction =>
  ({ taskInstance }) => {
    let cancelled = false;
    console.log(`Creating GREAT SUCCESS factory`);
    const isCancelled = () => cancelled;
    return {
      run: async () =>
        runPrivilegeMonitoringTask({
          isCancelled,
          logger: deps.logger,
          telemetry: deps.telemetry,
          taskInstance,
          experimentalFeatures: deps.experimentalFeatures,
        }),
      cancel: async () => {
        cancelled = true;
      },
    };
  };

const runPrivilegeMonitoringTask = async ({
  isCancelled,
  logger,
  telemetry,
  taskInstance,
  experimentalFeatures,
}: RunParams): Promise<void> => {
  logger.info('[Privilege Monitoring] Running privilege monitoring task');
  if (isCancelled()) {
    logger.info('[Privilege Monitoring] Task was cancelled.');
    return;
  }

  try {
    console.log('GREAT SUCCESS');
  } catch (e) {
    logger.error('[Privilege Monitoring] Error running privilege monitoring task', e);
  }
};

export const startPrivilegeMonitoringTask = async ({
  logger,
  namespace,
  taskManager,
}: StartParams) => {
  const taskId = getTaskId(namespace);

  try {
    console.log(`Starting the start GREAT SUCCESS`);
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: getTaskName(),
      scope: SCOPE,
      schedule: {
        interval: INTERVAL,
      },
      state: { ...defaultState, namespace },
      params: { version: VERSION },
    });
  } catch (e) {
    logger.warn(
      `[Privilege Monitoring]  [task ${taskId}]: error scheduling task, received ${e.message}`
    );
    throw e;
  }
};
