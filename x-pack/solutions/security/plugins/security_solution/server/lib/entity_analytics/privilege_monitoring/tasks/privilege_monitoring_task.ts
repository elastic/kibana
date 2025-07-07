/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, AnalyticsServiceSetup, AuditLogger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server';

import moment from 'moment';
import type { ExperimentalFeatures } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';

import { TYPE, VERSION, TIMEOUT, SCOPE, INTERVAL } from '../constants';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as PrivilegeMonitoringTaskState,
} from './state';
import { getApiKeyManager } from '../auth/api_key';
import { PrivilegeMonitoringDataClient } from '../privilege_monitoring_data_client';
import { buildScopedInternalSavedObjectsClientUnsafe } from '../../risk_score/tasks/helpers';

interface RegisterParams {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  auditLogger?: AuditLogger;
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
  getPrivilegedUserMonitoringDataClient: (
    namespace: string
  ) => Promise<undefined | PrivilegeMonitoringDataClient>;
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
  auditLogger,
  telemetry,
  taskManager,
  kibanaVersion,
  experimentalFeatures,
}: RegisterParams): void => {
  if (!taskManager) {
    logger.info(
      '[Privilege Monitoring]  Task Manager is unavailable; skipping privilege monitoring task registration.'
    );
    return;
  }
  const getPrivilegedUserMonitoringDataClient = async (namespace: string) => {
    const [core, { taskManager: taskManagerStart, security, encryptedSavedObjects }] =
      await getStartServices();

    const apiKeyManager = getApiKeyManager({
      core,
      logger,
      security,
      encryptedSavedObjects,
      namespace,
    });

    const client = await apiKeyManager.getClient();

    if (!client) {
      logger.error('[Privilege Monitoring] Unable to create Elasticsearch client from API key.');
      return undefined;
    }

    const soClient = buildScopedInternalSavedObjectsClientUnsafe({ coreStart: core, namespace });

    return new PrivilegeMonitoringDataClient({
      logger,
      clusterClient: client.clusterClient,
      namespace,
      soClient,
      taskManager: taskManagerStart,
      auditLogger,
      kibanaVersion,
      telemetry,
      apiKeyManager,
    });
  };

  taskManager.registerTaskDefinitions({
    [getTaskName()]: {
      title: 'Entity Analytics Privilege Monitoring',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createPrivilegeMonitoringTaskRunnerFactory({
        logger,
        telemetry,
        experimentalFeatures,
        getPrivilegedUserMonitoringDataClient,
      }),
    },
  });
};

const createPrivilegeMonitoringTaskRunnerFactory =
  (deps: {
    logger: Logger;
    telemetry: AnalyticsServiceSetup;
    experimentalFeatures: ExperimentalFeatures;
    getPrivilegedUserMonitoringDataClient: (
      namespace: string
    ) => Promise<undefined | PrivilegeMonitoringDataClient>;
  }): TaskRunCreatorFunction =>
  ({ taskInstance }) => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    return {
      run: async () =>
        runPrivilegeMonitoringTask({
          isCancelled,
          logger: deps.logger,
          telemetry: deps.telemetry,
          taskInstance,
          experimentalFeatures: deps.experimentalFeatures,
          getPrivilegedUserMonitoringDataClient: deps.getPrivilegedUserMonitoringDataClient,
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
  getPrivilegedUserMonitoringDataClient,
}: RunParams): Promise<{
  state: PrivilegeMonitoringTaskState;
}> => {
  const state = taskInstance.state as PrivilegeMonitoringTaskState;
  const taskStartTime = moment().utc().toISOString();
  const updatedState = {
    lastExecutionTimestamp: taskStartTime,
    namespace: state.namespace,
    runs: state.runs + 1,
  };
  if (isCancelled()) {
    logger.info('[Privilege Monitoring] Task was cancelled.');
    return { state: updatedState };
  }

  try {
    logger.info('[Privilege Monitoring] Running privilege monitoring task');
    const dataClient = await getPrivilegedUserMonitoringDataClient(state.namespace);
    if (!dataClient) {
      logger.error('[Privilege Monitoring] error creating data client.');
      throw Error('No data client was found');
    }
    await dataClient.plainIndexSync();
  } catch (e) {
    logger.error(`[Privilege Monitoring] Error running privilege monitoring task: ${e.message}`);
  }
  logger.info('[Privilege Monitoring] Finished running privilege monitoring task');
  return { state: updatedState };
};

export const startPrivilegeMonitoringTask = async ({
  logger,
  namespace,
  taskManager,
}: StartParams) => {
  const taskId = getTaskId(namespace);

  try {
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

    logger.info(`Scheduling privilege monitoring task with id ${taskId}`);
  } catch (e) {
    logger.warn(
      `[Privilege Monitoring]  [task ${taskId}]: error scheduling task, received ${e.message}`
    );
    throw e;
  }
};
