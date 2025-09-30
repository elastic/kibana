/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CoreStart,
  type Logger,
  type AnalyticsServiceSetup,
  SECURITY_EXTENSION_ID,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server';

import moment from 'moment';
import type { RunSoonResult } from '@kbn/task-manager-plugin/server/task_scheduling';
import type { ExperimentalFeatures } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';

import { TYPE, VERSION, TIMEOUT, SCOPE, INTERVAL } from '../constants';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as PrivilegeMonitoringTaskState,
} from './state';
import { getApiKeyManager } from '../auth/api_key';
import { PrivilegeMonitoringDataClient } from '../engine/data_client';
import { createDataSourcesService } from '../data_sources/data_sources_service';
import { buildFakeScopedRequest } from '../../risk_score/tasks/helpers';
import { PrivilegeMonitoringApiKeyType } from '../auth/saved_object';
import { monitoringEntitySourceType } from '../saved_objects';

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
  core: CoreStart;
  getPrivilegedUserMonitoringDataClient: (
    namespace: string
  ) => Promise<undefined | PrivilegeMonitoringDataClient>;
}

interface StartParams {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}

class EngineAlreadyRunningError extends Error {
  statusCode: number;

  constructor() {
    super('The monitoring engine is already running');
    this.statusCode = 409;
  }
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
}: RegisterParams) => {
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

    return new PrivilegeMonitoringDataClient({
      logger,
      clusterClient: client.clusterClient,
      namespace,
      taskManager: taskManagerStart,
      savedObjects: core.savedObjects,
      auditLogger: core.security.audit.withoutRequest,
      experimentalFeatures,
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
        getStartServices,
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
    getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
    getPrivilegedUserMonitoringDataClient: (
      namespace: string
    ) => Promise<undefined | PrivilegeMonitoringDataClient>;
  }): TaskRunCreatorFunction =>
  ({ taskInstance }) => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    return {
      run: async () => {
        const [core] = await deps.getStartServices();
        return runPrivilegeMonitoringTask({
          isCancelled,
          logger: deps.logger,
          telemetry: deps.telemetry,
          taskInstance,
          experimentalFeatures: deps.experimentalFeatures,
          core,
          getPrivilegedUserMonitoringDataClient: deps.getPrivilegedUserMonitoringDataClient,
        });
      },
      cancel: async () => {
        cancelled = true;
      },
    };
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

const runPrivilegeMonitoringTask = async ({
  isCancelled,
  logger,
  taskInstance,
  getPrivilegedUserMonitoringDataClient,
  core,
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

    const request = buildFakeScopedRequest({
      namespace: state.namespace,
      coreStart: core,
    });
    const soClient = core.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [PrivilegeMonitoringApiKeyType.name, monitoringEntitySourceType.name],
      excludedExtensions: [SECURITY_EXTENSION_ID],
    });
    const dataSourcesService = createDataSourcesService(dataClient, soClient);
    await dataSourcesService.syncAllSources();
  } catch (e) {
    logger.error(`[Privilege Monitoring] Error running privilege monitoring task: ${e.message}`);
  }
  logger.info('[Privilege Monitoring] Finished running privilege monitoring task');
  return { state: updatedState };
};

export const removePrivilegeMonitoringTask = async ({
  taskManager,
  namespace,
  logger,
}: StartParams) => {
  const taskId = getTaskId(namespace);
  try {
    await taskManager.removeIfExists(taskId);
    logger.info(`Removed privilege monitoring task with id ${taskId}`);
  } catch (e) {
    logger.warn(
      `[Privilege Monitoring][task ${taskId}]: error removing task, received ${e.message}`
    );
    throw e;
  }
};

export const scheduleNow = async ({
  logger,
  namespace,
  taskManager,
}: StartParams): Promise<RunSoonResult> => {
  const taskId = getTaskId(namespace);

  logger.info(`[Privilege Monitoring][task ${taskId}]: Attempting to schedule task to run now`);
  try {
    return taskManager.runSoon(taskId);
  } catch (e) {
    logger.warn(
      `[Privilege Monitoring][task ${taskId}]: error scheduling task now, received '${e.message}'`
    );

    if (e.message.contains('as it is currently running')) {
      throw new EngineAlreadyRunningError();
    }
    throw e;
  }
};
