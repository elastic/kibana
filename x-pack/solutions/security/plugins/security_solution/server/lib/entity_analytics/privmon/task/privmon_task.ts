/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  type Logger,
  SavedObjectsErrorHelpers,
  type StartServicesAccessor,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import type { StartPlugins } from '../../../../plugin';
import { privmonServiceFactory } from '../privmon_service';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as PrivmonTaskState,
} from './state';
import { SCOPE, TIMEOUT, TYPE, VERSION, INTERVAL } from './constants';
import type { ExperimentalFeatures } from '../../../../../common';
import { PrivmonDataClient } from '../privmon_data_client';
import {
  AssetCriticalityDataClient,
  assetCriticalityServiceFactory,
} from '../../asset_criticality';
import { buildScopedInternalSavedObjectsClientUnsafe } from '../../risk_score/tasks/helpers';

const logFactory =
  (logger: Logger, taskId: string) =>
  (message: string): void =>
    logger.info(`[task ${taskId}]: ${message}`);

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

type GetPrivmonService = (namespace: string) => Promise<ReturnType<typeof privmonServiceFactory>>;

export const registerPrivmonTask = ({
  experimentalFeatures,
  getStartServices,
  kibanaVersion,
  logger,
  taskManager,
  telemetry,
  auditLogger,
}: {
  auditLogger: AuditLogger | undefined;
  experimentalFeatures: ExperimentalFeatures;
  getStartServices: StartServicesAccessor<StartPlugins>;
  kibanaVersion: string;
  logger: Logger;
  taskManager: TaskManagerSetupContract | undefined;
  telemetry: AnalyticsServiceSetup;
}): void => {
  if (!taskManager) {
    logger.info('Task Manager is unavailable; skipping privmon task registration.');
    return;
  }

  const getPrivmonService: GetPrivmonService = (namespace) =>
    getStartServices().then(async ([coreStart, startPlugins]) => {
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const soClient = buildScopedInternalSavedObjectsClientUnsafe({ coreStart, namespace });
      const dataViewsService = await startPlugins.dataViews.dataViewsServiceFactory(
        soClient,
        esClient
      );

      const assetCriticalityDataClient = new AssetCriticalityDataClient({
        esClient,
        logger,
        namespace,
        auditLogger,
      });

      const assetCriticalityService = assetCriticalityServiceFactory({
        assetCriticalityDataClient,
        uiSettingsClient: coreStart.uiSettings.asScopedToClient(soClient),
      });

      const privmonDataClient = new PrivmonDataClient({
        logger,
        esClient,
        namespace,
        dataViewsService,
      });

      return privmonServiceFactory({
        esClient,
        logger,
        privmonDataClient,
        assetCriticalityService,
        namespace,
      });
    });

  taskManager.registerTaskDefinitions({
    [TYPE]: {
      title: 'Entity Analytics entity store - Check for updates Task',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createTaskRunnerFactory({ logger, getPrivmonService, telemetry }),
    },
  });
};

export const startPrivmonTask = async ({
  logger,
  namespace,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}) => {
  const taskId = getTaskId(namespace);
  const log = logFactory(logger, taskId);
  log('starting privmon task');
  log('attempting to schedule privmon task');
  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: TYPE,
      scope: SCOPE,
      schedule: {
        interval: INTERVAL,
      },
      state: { ...defaultState, namespace },
      params: { version: VERSION },
    });
    log('privmon task successfully scheduled');
  } catch (e) {
    logger.warn(`[task ${taskId}]: error scheduling task, received ${e.message}`);
    throw e;
  }
};

export const removePrivmonTask = async ({
  logger,
  namespace,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}) => {
  try {
    await taskManager.remove(getTaskId(namespace));
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(`Failed to remove entity store task: ${err.message}`);
      throw err;
    }
  }
};

export const runTask = async ({
  getPrivmonService,
  isCancelled,
  logger,
  taskInstance,
  telemetry,
}: {
  logger: Logger;
  isCancelled: () => boolean;
  getPrivmonService: GetPrivmonService;
  taskInstance: ConcreteTaskInstance;
  telemetry: AnalyticsServiceSetup;
}): Promise<{
  state: PrivmonTaskState;
}> => {
  const state = taskInstance.state as PrivmonTaskState;
  const taskId = taskInstance.id;
  const log = logFactory(logger, taskId);
  const taskStartTime = moment().utc().toISOString();
  log('running task');

  const updatedState: PrivmonTaskState = {
    timestamps: {
      lastExecution: taskStartTime,
    },
    namespace: state.namespace,
    runs: state.runs + 1,
  };

  if (taskId !== getTaskId(state.namespace)) {
    log('outdated task; exiting');
    return { state: updatedState };
  }

  const entityStoreService = await getPrivmonService(state.namespace);
  if (!entityStoreService) {
    log('entity store service is not available; exiting task');
    return { state: updatedState };
  }

  const { usersUpdated, usersCreated, errors, timestamps } =
    await entityStoreService.updatePrivilegedUsers({
      timestamps: state.timestamps,
    });

  log(`errors: ${errors}`);
  log(`usersUpdated: ${usersUpdated}`);
  log(`usersCreated: ${usersCreated}`);
  updatedState.timestamps = timestamps;

  const taskCompletionTime = moment().utc().toISOString();
  const taskDurationInSeconds = moment(taskCompletionTime).diff(moment(taskStartTime), 'seconds');
  log(`taskDurationInSeconds: ${taskDurationInSeconds}`);
  if (isCancelled()) {
    log('task was cancelled');
  }

  log('task run completed');
  return {
    state: updatedState,
  };
};

const createTaskRunnerFactory =
  ({
    logger,
    getPrivmonService,
    telemetry,
  }: {
    logger: Logger;
    getPrivmonService: GetPrivmonService;
    telemetry: AnalyticsServiceSetup;
  }) =>
  ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    return {
      run: async () => runTask({ getPrivmonService, isCancelled, logger, taskInstance, telemetry }),
      cancel: async () => {
        cancelled = true;
      },
    };
  };
