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

  try {
    logger.info('[LeadGeneration] Running scheduled lead generation task');
    // Use the scoped client from fakeRequest when available so the task runs
    // with the user's privileges. Entity Store indices (entities-latest-*) are
    // not accessible to kibana_system, so asInternalUser is insufficient.
    const esClient = fakeRequest
      ? core.elasticsearch.client.asScoped(fakeRequest).asCurrentUser
      : core.elasticsearch.client.asInternalUser;
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

    let chatModel;
    if (fakeRequest) {
      try {
        const defaultConnector = await startPlugins.inference.getDefaultConnector(fakeRequest);
        chatModel = await startPlugins.inference.getChatModel({
          request: fakeRequest,
          connectorId: defaultConnector.connectorId,
          chatModelOptions: {
            temperature: 0, // structured JSON output — determinism preferred over creativity
            maxRetries: 0,
            telemetryMetadata: { pluginId: 'securitySolution' },
          },
        });
      } catch (e) {
        logger.warn(
          `[LeadGeneration] Could not resolve inference connector for scheduled task; falling back to rule-based synthesis: ${e.message}`
        );
      }
    } else {
      logger.warn(
        '[LeadGeneration] No fakeRequest available in task context; falling back to rule-based synthesis'
      );
    }

    await runLeadGenerationPipeline({
      listEntities: () => fetchAllLeadEntities(crudClient, logger),
      esClient,
      logger,
      spaceId: state.namespace,
      riskScoreDataClient,
      sourceType: 'scheduled',
      chatModel,
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
    // ensureScheduled drops the `request` option when falling back to bulkUpdateSchedules
    // on a version conflict (Task Manager bug). Workaround: remove the stale task and
    // re-schedule so the new API key is stored correctly.
    if (e.message?.includes('Request is not defined')) {
      logger.warn(
        `[LeadGeneration][task ${taskId}] ensureScheduled failed due to stale API key scope — removing and re-scheduling`
      );
      await taskManager.removeIfExists(taskId);
      await taskManager.schedule(taskDefinition, { request });
      logger.info(`[LeadGeneration] Re-scheduled lead generation task with id ${taskId}`);
      return;
    }
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
