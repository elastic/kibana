/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger, AnalyticsServiceSetup } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskRunCreatorFunction,
} from '@kbn/task-manager-plugin/server';
import {
  createTaskRunError,
  TaskErrorSource,
  getErrorSource,
} from '@kbn/task-manager-plugin/server/task_running';
import moment from 'moment';

import { v4 as uuidv4 } from 'uuid';
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
import { fetchCandidateEntities } from '../entity_conversion';
import { getLeadGenerationConfig, updateLeadGenerationConfig } from '../saved_object';
import { resolveChatModel } from '../utils';

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
  request: KibanaRequest;
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
  ({ taskInstance, fakeRequest }) => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    return {
      run: async () => {
        const [core, startPlugins] = await deps.getStartServices();
        return runLeadGenerationTask({
          isCancelled,
          logger: deps.logger,
          taskInstance,
          fakeRequest,
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
  fakeRequest,
  core,
  startPlugins,
  kibanaVersion,
}: {
  isCancelled: () => boolean;
  logger: Logger;
  taskInstance: ConcreteTaskInstance;
  fakeRequest: KibanaRequest | undefined;
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

  const executionUuid = uuidv4();
  const soClient = buildScopedInternalSavedObjectsClientUnsafe({
    coreStart: core,
    namespace: state.namespace,
  });

  try {
    logger.info('[LeadGeneration] Running scheduled lead generation task');

    if (!fakeRequest) {
      throw createTaskRunError(
        new Error('No fakeRequest available in task context; cannot resolve inference connector'),
        TaskErrorSource.FRAMEWORK
      );
    }

    // Use the scoped client so the task runs with the user's privileges.
    // Entity Store indices (entities-latest-*) are not accessible to kibana_system.
    const esClient = core.elasticsearch.client.asScoped(fakeRequest).asCurrentUser;
    const crudClient = startPlugins.entityStore.createCRUDClient(esClient, state.namespace);
    const riskScoreDataClient = new RiskScoreDataClient({
      logger,
      kibanaVersion,
      esClient,
      namespace: state.namespace,
      soClient,
    });

    const config = await getLeadGenerationConfig(soClient, state.namespace);
    if (!config?.connectorId) {
      throw createTaskRunError(
        new Error(
          'No connectorId configured; skipping scheduled run. Call POST /enable with a connectorId first.'
        ),
        TaskErrorSource.USER
      );
    }

    const chatModel = await resolveChatModel(
      startPlugins.inference,
      fakeRequest,
      config.connectorId
    );

    await runLeadGenerationPipeline({
      listEntities: () => fetchCandidateEntities(crudClient, logger),
      esClient,
      logger,
      spaceId: state.namespace,
      riskScoreDataClient,
      executionId: executionUuid,
      sourceType: 'scheduled',
      chatModel,
    });

    await updateLeadGenerationConfig(soClient, state.namespace, {
      lastExecutionUuid: executionUuid,
      lastError: null,
    }).catch((soErr: Error) =>
      logger.warn(`[LeadGeneration] Failed to persist execution success: ${soErr.message}`)
    );
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    logger.error(`[LeadGeneration] Error running scheduled lead generation task: ${errorMessage}`);

    await updateLeadGenerationConfig(soClient, state.namespace, {
      lastExecutionUuid: executionUuid,
      lastError: errorMessage,
    }).catch((soErr: Error) =>
      logger.warn(`[LeadGeneration] Failed to persist execution error: ${soErr.message}`)
    );

    // Re-throw decorated errors so Task Manager correctly tracks USER vs FRAMEWORK failures.
    if (getErrorSource(e)) {
      throw e;
    }
  }

  logger.info('[LeadGeneration] Finished running scheduled lead generation task');
  return { state: updatedState };
};

// ---------------------------------------------------------------------------
// Start (schedule the task)
// ---------------------------------------------------------------------------

export const startLeadGenerationTask = async ({
  logger,
  namespace,
  taskManager,
  request,
}: StartParams) => {
  const taskId = getTaskId(namespace);
  const taskDefinition = {
    id: taskId,
    taskType: getTaskName(),
    scope: SCOPE,
    schedule: { interval: INTERVAL },
    state: { ...defaultState, namespace },
    params: { version: VERSION },
  };

  try {
    await taskManager.ensureScheduled(taskDefinition, { request });
    logger.info(`[LeadGeneration] Scheduled lead generation task with id ${taskId}`);
  } catch (e) {
    logger.warn(`[LeadGeneration][task ${taskId}]: error scheduling task, received ${e.message}`);
    throw e;
  }
};

// ---------------------------------------------------------------------------
// Remove (unschedule the task)
// ---------------------------------------------------------------------------

export const removeLeadGenerationTask = async ({
  taskManager,
  namespace,
  logger,
}: Omit<StartParams, 'request'>) => {
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
