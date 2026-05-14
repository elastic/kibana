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
import moment from 'moment';
import { TasksConfig } from './config';
import { EntityStoreTaskType } from './constants';
import type * as types from '../types';
import type { EntityType } from '../../common/domain/definitions/entity_schema';
import { createLogsExtractionClient } from './factories';
import { wrapTaskRun } from '../telemetry/traces';
import {
  coerceTaskState,
  toTaskManagerState,
  type ExtractEntityTaskState,
  type KiDefinitionStates,
} from './extract_entity_task_state';
import {
  createKnowledgeIndicatorsReader,
  loadStreamSchemaAliases,
} from '../domain/streams_features';
import {
  runKnowledgeIndicatorsExtraction,
  type KnowledgeIndicatorsLoopMetrics,
} from './knowledge_indicators_loop';
import { ENTITY_STORE_KI_LOOP_EVENT, createReportEvent } from '../telemetry/events';

function getTaskType(entityType: EntityType): string {
  const config = TasksConfig[EntityStoreTaskType.enum.extractEntity];
  return `${config.type}:${entityType}`;
}

export function getExtractEntityTaskId(entityType: EntityType, namespace: string): string {
  return `${getTaskType(entityType)}:${namespace}`;
}

async function runTask({
  taskInstance,
  fakeRequest,
  abortController,
  entityType,
  logger,
  core,
}: RunContext & {
  entityType: EntityType;
  logger: Logger;
  core: types.EntityStoreCoreSetup;
}): Promise<RunResult> {
  logger.info(`Running extract entity task`);

  const currentState = coerceTaskState(taskInstance.state);
  const { runs, namespace } = currentState;

  if (!fakeRequest) {
    logger.error(`No fake request found, skipping extract entity task`);
    return {
      state: toTaskManagerState({ ...currentState } satisfies ExtractEntityTaskState),
    };
  }

  try {
    const { logsExtractionClient, globalStateClient } = await createLogsExtractionClient({
      core,
      fakeRequest,
      logger,
      namespace,
    });

    // Schema-feature alias contexts: loaded once per task run and passed to
    // every static-engine extraction in this task. The loader is a no-op when
    // `schemaAliasMinConfidence` is null (the default), so disabled tenants
    // skip the streams round-trip entirely. Failures here log at warn and
    // fall through to a default-only extraction; aliasing is opportunistic.
    let aliasContexts: Awaited<ReturnType<typeof loadStreamSchemaAliases>> = [];
    try {
      const reader = await createKnowledgeIndicatorsReader({ core, fakeRequest, logger });
      const globalStateForAliases = await globalStateClient.findOrThrow();
      aliasContexts = await loadStreamSchemaAliases(
        reader,
        {
          minConfidence: globalStateForAliases.knowledgeIndicators.schemaAliasMinConfidence,
        },
        logger
      );
    } catch (aliasLoadError) {
      const message =
        aliasLoadError instanceof Error ? aliasLoadError.message : String(aliasLoadError);
      logger.warn(
        `[entity_store] Failed to load schema-feature aliases (${message}); falling back to default-only extraction`
      );
    }

    const extractionStart = Date.now();
    const extractionResult = await logsExtractionClient.extractLogs(entityType, {
      abortController,
      aliasContexts,
    });
    const extractionDuration = moment().diff(extractionStart, 'milliseconds');

    if (!extractionResult.success) {
      logger.error(
        `Logs extraction failed for ${entityType}: ${extractionResult.error.message}, took ${extractionDuration}ms`
      );
    } else {
      logger.info(
        `Successfully extracted ${extractionResult.count} entities for ${entityType}, took ${extractionDuration}ms  `
      );
    }

    // Stream-derived (Knowledge Indicators) entity extraction runs ONLY for
    // the generic entity type, AFTER the static generic extraction so that
    // a KI-loop failure can never undo a successful static run. Errors
    // thrown by the KI loop itself (e.g. global state SO missing, streams
    // ES unreachable for the initial feature read) are caught locally and
    // logged at warn level — they do not flip the task into the error
    // branch of the outer try/catch.
    let kiDefinitionStates: KiDefinitionStates | undefined = currentState.kiDefinitionStates;
    let kiMetrics: KnowledgeIndicatorsLoopMetrics | undefined;
    if (entityType === 'generic') {
      try {
        const reader = await createKnowledgeIndicatorsReader({ core, fakeRequest, logger });
        const globalState = await globalStateClient.findOrThrow();
        const kiResult = await runKnowledgeIndicatorsExtraction(
          {
            logger,
            reader,
            logsExtractionClient,
            namespace,
            config: globalState.logsExtraction,
            knowledgeIndicatorsConfig: globalState.knowledgeIndicators,
            abortController,
          },
          { currentStates: kiDefinitionStates }
        );
        kiDefinitionStates = kiResult.updatedStates;
        kiMetrics = kiResult.metrics;
        logger.info(
          `KI extraction loop: total=${kiMetrics.groupsTotal} ` +
            `succeeded=${kiMetrics.groupsSucceeded} failed=${kiMetrics.groupsFailed} ` +
            `skipped=${kiMetrics.groupsSkippedNoIndexPatterns} ` +
            `truncated=${kiMetrics.groupsTruncated}`
        );
        // Telemetry is emitted ONLY on completed loops, not on the
        // pre-loop catch path. A pre-loop crash means we have no metrics
        // to report; the local warn log is the only signal.
        const telemetryReporter = createReportEvent(core.analytics);
        telemetryReporter.reportEvent(ENTITY_STORE_KI_LOOP_EVENT, {
          namespace,
          ...kiMetrics,
        });
      } catch (kiError) {
        const message = kiError instanceof Error ? kiError.message : String(kiError);
        logger.warn(
          `KI extraction loop aborted before processing groups (${message}); ` +
            `static generic extraction result is unaffected.`
        );
      }
    }

    const updatedState: ExtractEntityTaskState = {
      namespace,
      lastExecutionTimestamp: new Date().toISOString(),
      runs: runs + 1,
      entityType,
      lastExtractionSuccess: extractionResult.success,
      status: 'success',
      kiDefinitionStates,
    };

    return {
      state: toTaskManagerState(updatedState),
    };
  } catch (e) {
    logger.error(`Error running extract entity task, received ${e.message}`);
    const errorState: ExtractEntityTaskState = {
      ...currentState,
      lastError: e.message,
      lastErrorTimestamp: new Date().toISOString(),
      status: 'error',
      entityType,
    };
    return {
      state: toTaskManagerState(errorState),
    };
  }
}

export function registerExtractEntityTasks({
  taskManager,
  logger,
  entityTypes,
  core,
}: {
  core: types.EntityStoreCoreSetup;
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  entityTypes: EntityType[];
}): void {
  try {
    const config = TasksConfig[EntityStoreTaskType.enum.extractEntity];
    entityTypes.forEach((type) => {
      const taskType = getTaskType(type);
      taskManager.registerTaskDefinitions({
        [taskType]: {
          title: config.title,
          timeout: config.timeout,
          createTaskRunner: ({ taskInstance, abortController, fakeRequest }) => ({
            run: () =>
              wrapTaskRun({
                spanName: 'entityStore.task.extract_entity.run',
                namespace: taskInstance.state.namespace,
                attributes: {
                  'entity_store.task.id': taskInstance.id,
                  'entity_store.task.type': taskType,
                  'entity_store.entity.type': type,
                },
                run: () =>
                  runTask({
                    taskInstance,
                    abortController,
                    logger: logger.get(taskInstance.id),
                    core,
                    entityType: type,
                    fakeRequest,
                  }),
              }),
          }),
        },
      });
    });
  } catch (e) {
    logger.error(`Error registering extract entity tasks, received ${e.message}`);
    throw e;
  }
}

export async function scheduleExtractEntityTask({
  logger,
  taskManager,
  type,
  namespace,
  frequency,
  request,
}: {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  type: EntityType;
  frequency: string;
  namespace: string;
  request: KibanaRequest;
}): Promise<void> {
  try {
    const taskType = getTaskType(type);
    const taskId = getExtractEntityTaskId(type, namespace);
    const interval = frequency ?? TasksConfig[EntityStoreTaskType.enum.extractEntity].interval;
    await taskManager.ensureScheduled(
      {
        id: taskId,
        taskType,
        schedule: { interval },
        state: { namespace },
        params: {},
      },
      { request }
    );
  } catch (e) {
    logger.error(`Error scheduling extract entity tasks, received ${e.message}`);
    throw e;
  }
}

export async function stopExtractEntityTask({
  taskManager,
  logger,
  type,
  namespace,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  type: EntityType;
  namespace: string;
}): Promise<void> {
  const taskId = getExtractEntityTaskId(type, namespace);
  await taskManager.removeIfExists(taskId);
  logger.debug(`removed extract entity task: ${taskId}`);
}
