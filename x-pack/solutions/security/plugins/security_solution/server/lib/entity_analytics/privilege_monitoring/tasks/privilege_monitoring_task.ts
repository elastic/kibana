/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stateSchemaByVersion } from '@kbn/alerting-state-types';
import type { Logger, AnalyticsServiceSetup } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server';

import type { ExperimentalFeatures } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';

import { TYPE, VERSION, TIMEOUT } from './constants';

interface RegisterParams {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  taskManager: TaskManagerSetupContract | undefined;
  experimentalFeatures: ExperimentalFeatures;
}

const getTaskName = (): string => TYPE;

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

export const registerPrivilegeMonitoringTask = ({
  getStartServices,
  logger,
  telemetry,
  taskManager,
  experimentalFeatures,
}: RegisterParams): void => {
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
    const isCancelled = () => cancelled;
    return {
      run: runPrivilegeMonitoringTask({
        isCancelled,
        logger: deps.logger,
        telemetry: deps.telemetry,
        experimentalFeatures: deps.experimentalFeatures,
      }),
      cancel: async () => {
        cancelled = true;
      },
    };
  };

interface RunParams {
  isCancelled: () => boolean;
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  experimentalFeatures: ExperimentalFeatures;
}

const runPrivilegeMonitoringTask = async ({
  isCancelled,
  logger,
  telemetry,
  experimentalFeatures,
}: RunParams): Promise<void> => {
  logger.info('[Privilege Monitoring] Running privilege monitoring task');
  if (isCancelled()) {
    logger.info('[Privilege Monitoring] Task was cancelled.');
    return;
  }

  try {
    // eslint-disable-next-line no-console
    console.log('GREAT SUCCESS');
  } catch (e) {
    logger.error('[Privilege Monitoring] Error running privilege monitoring task', e);
  }
};
