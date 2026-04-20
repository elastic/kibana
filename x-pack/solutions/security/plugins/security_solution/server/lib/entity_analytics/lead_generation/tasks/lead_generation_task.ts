/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger, AnalyticsServiceSetup } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server';
import moment from 'moment';

import type { ExperimentalFeatures } from '../../../../../common';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import type { ConfigType } from '../../../../config';
import type { StartPlugins } from '../../../../plugin_contract';
import { RiskScoreDataClient } from '../../risk_score/risk_score_data_client';
import { buildScopedInternalSavedObjectsClientUnsafe } from '../../risk_score/tasks/helpers';
import { TYPE, VERSION, TIMEOUT, SCOPE, INTERVAL } from './constants';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as LeadGenerationTaskState,
} from './state';
import { runLeadGenerationPipeline } from '../run_pipeline';
import { fetchAllLeadEntities } from '../entity_conversion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegisterParams {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  taskManager: TaskManagerSetupContract | undefined;
  experimentalFeatures: ExperimentalFeatures;
  kibanaVersion: string;
  config: ConfigType;
}

interface StartParams {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getTaskName = (): string => TYPE;

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

// ---------------------------------------------------------------------------
// Registration (called during plugin setup)
// ---------------------------------------------------------------------------

export const registerLeadGenerationTask = ({
  getStartServices,
  logger,
  taskManager,
  experimentalFeatures,
  config,
  kibanaVersion,
}: RegisterParams) => {
  if (!taskManager) {
    logger.info(
      '[LeadGeneration] Task Manager is unavailable; skipping lead generation task registration.'
    );
    return;
  }

  if (!experimentalFeatures.leadGenerationEnabled) {
    return;
  }

  taskManager.registerTaskDefinitions({
    [getTaskName()]: {
      title: 'Entity Analytics Lead Generation',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createLeadGenerationTaskRunnerFactory({
        logger,
        getStartServices,
        config,
        kibanaVersion,
      }),
    },
  });

  logger.debug('[LeadGeneration] Registered lead generation task definition');
};

// ---------------------------------------------------------------------------
// Task runner factory
// ---------------------------------------------------------------------------

const createLeadGenerationTaskRunnerFactory =
  (deps: {
    logger: Logger;
    getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
    config: ConfigType;
    kibanaVersion: string;
  }): TaskRunCreatorFunction =>
  ({ taskInstance }) => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    return {
      run: async () => {
        const [core, startPlugins] = await deps.getStartServices();
        return runLeadGenerationTask({
          isCancelled,
          logger: deps.logger,
          taskInstance,
          core,
          startPlugins,
          kibanaVersion: deps.kibanaVersion,
        });
      },
      cancel: async () => {
        cancelled = true;
      },
    };
  };

// ---------------------------------------------------------------------------
// Task execution
// ---------------------------------------------------------------------------

const runLeadGenerationTask = async ({
  isCancelled,
  logger,
  taskInstance,
  core,
  startPlugins,
  kibanaVersion,
}: {
  isCancelled: () => boolean;
  logger: Logger;
  taskInstance: ConcreteTaskInstance;
  core: CoreStart;
  startPlugins: StartPlugins;
  kibanaVersion: string;
}): Promise<{ state: LeadGenerationTaskState }> => {
  const state = taskInstance.state as LeadGenerationTaskState;
  const taskStartTime = moment().utc().toISOString();
  const updatedState: LeadGenerationTaskState = {
    lastExecutionTimestamp: taskStartTime,
    namespace: state.namespace,
    runs: state.runs + 1,
  };

  if (isCancelled()) {
    logger.info('[LeadGeneration] Task was cancelled.');
    return { state: updatedState };
  }

  try {
    logger.info('[LeadGeneration] Running scheduled lead generation task');
    const esClient = core.elasticsearch.client.asInternalUser;
    const soClient = buildScopedInternalSavedObjectsClientUnsafe({
      coreStart: core,
      namespace: state.namespace,
    });
    const crudClient = startPlugins.entityStore.createCRUDClient(esClient, state.namespace);
    const riskScoreDataClient = new RiskScoreDataClient({
      logger,
      kibanaVersion,
      esClient,
      namespace: state.namespace,
      soClient,
    });

    await runLeadGenerationPipeline({
      listEntities: () => fetchAllLeadEntities(crudClient, logger),
      esClient,
      logger,
      spaceId: state.namespace,
      riskScoreDataClient,
      sourceType: 'scheduled',
    });
  } catch (e) {
    logger.error(`[LeadGeneration] Error running scheduled lead generation task: ${e.message}`);
  }

  logger.info('[LeadGeneration] Finished running scheduled lead generation task');
  return { state: updatedState };
};

// ---------------------------------------------------------------------------
// Start (schedule the task)
// ---------------------------------------------------------------------------

export const startLeadGenerationTask = async ({ logger, namespace, taskManager }: StartParams) => {
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

    logger.info(`[LeadGeneration] Scheduled lead generation task with id ${taskId}`);
  } catch (e) {
    logger.warn(`[LeadGeneration][task ${taskId}]: error scheduling task, received ${e.message}`);
    throw e;
  }
};

// ---------------------------------------------------------------------------
// Remove (unschedule the task)
// ---------------------------------------------------------------------------

export const removeLeadGenerationTask = async ({ taskManager, namespace, logger }: StartParams) => {
  const taskId = getTaskId(namespace);
  try {
    await taskManager.removeIfExists(taskId);
    logger.info(`[LeadGeneration] Removed lead generation task with id ${taskId}`);
  } catch (e) {
    logger.warn(`[LeadGeneration][task ${taskId}]: error removing task, received ${e.message}`);
    throw e;
  }
};

// ---------------------------------------------------------------------------
// Utility: get the task ID for status checks
// ---------------------------------------------------------------------------

export { getTaskId as getLeadGenerationTaskId };
