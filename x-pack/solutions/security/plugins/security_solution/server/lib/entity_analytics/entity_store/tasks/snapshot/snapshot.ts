/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  type AnalyticsServiceSetup,
  type ElasticsearchClient,
  type Logger,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { EntityType } from '../../../../../../common/api/entity_analytics/entity_store';
import { EngineComponentResourceEnum } from '../../../../../../common/api/entity_analytics/entity_store';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as EntityStoreFieldRetentionTaskState,
} from './state';
import {
  SCOPE,
  TIMEOUT,
  TYPE,
  VERSION,
  MAX_ATTEMPTS,
  MAX_CONCURRENCY,
  SCHEDULE,
} from './constants';

import { FIELD_RETENTION_ENRICH_POLICY_EXECUTION_EVENT } from '../../../../telemetry/event_based/events';
import { entityStoreTaskLogFactory } from '../utils';

function getTaskType(namespace: string, entityType: EntityType): string {
  return `${TYPE}:${entityType}:${namespace}`;
}

function getTaskId(namespace: string, entityType: EntityType): string {
  return `${getTaskType(namespace, entityType)}:${VERSION}`;
}

export function registerEntityStoreSnapshotTask({
  logger,
  namespace,
  entityType,
  telemetry,
  taskManager,
  esClient,
}: {
  logger: Logger;
  namespace: string;
  entityType: EntityType;
  telemetry: AnalyticsServiceSetup;
  taskManager: TaskManagerSetupContract | undefined;
  esClient: ElasticsearchClient;
}): void {
  if (!taskManager) {
    logger.warn(
      '[Entity Store]  Task Manager is unavailable; skipping Entity Store snapshot task registration'
    );
    return;
  }

  taskManager.registerTaskDefinitions({
    [getTaskType(namespace, entityType)]: {
      title: `Entity Store snapshot task for ${entityType} entities in ${namespace} namespace`,
      description: `Creates a snapshot every 24h and handles additional data transformations.`,
      timeout: TIMEOUT,
      maxAttempts: MAX_ATTEMPTS,
      maxConcurrency: MAX_CONCURRENCY,
      stateSchemaByVersion,
      createTaskRunner: (context: RunContext) => {
        return {
          async run() {
            return runTask({
              logger,
              telemetry,
              context,
              namespace,
              entityType,
              esClient,
            });
          },
          async cancel() {},
        };
      },
    },
  });
}

export async function startEntityStoreSnapshotTask({
  logger,
  namespace,
  entityType,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  entityType: EntityType;
  taskManager: TaskManagerStartContract;
}) {
  const taskId = getTaskId(namespace, entityType);
  const log = entityStoreTaskLogFactory(logger, taskId);

  log('attempting to schedule');
  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: getTaskType(namespace, entityType),
      scope: SCOPE,
      schedule: SCHEDULE,
      state: { ...defaultState, namespace, entityType },
      params: { version: VERSION },
    });
  } catch (e) {
    logger.warn(`[Entity Store]  [task ${taskId}]: error scheduling task, received ${e.message}`);
    throw e;
  }
}

export async function removeEntityStoreSnapshotTask({
  logger,
  namespace,
  entityType,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  entityType: EntityType;
  taskManager: TaskManagerStartContract;
}) {
  try {
    await taskManager.remove(getTaskId(namespace, entityType));
    logger.info(`[Entity Store]  Removed snapshot task for ${entityType} in ${namespace}`);
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(`[Entity Store]  Failed to remove snapshot task: ${err.message}`);
      throw err;
    }
  }
}

export async function runTask({
  logger,
  telemetry,
  context,
  namespace,
  entityType,
  esClient,
}: {
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  context: RunContext;
  namespace: string;
  entityType: EntityType;
  esClient: ElasticsearchClient;
}): Promise<{
  state: EntityStoreFieldRetentionTaskState;
}> {
  const state = context.taskInstance.state as EntityStoreFieldRetentionTaskState;
  const taskId = context.taskInstance.id;
  const log = entityStoreTaskLogFactory(logger, taskId);
  try {
    const taskStartTime = moment().utc();
    log('running task');

    const updatedState = {
      lastExecutionTimestamp: taskStartTime.toISOString(),
      namespace,
      entityType: entityType as string,
      runs: state.runs + 1,
    };

    if (taskId !== getTaskId(namespace, entityType)) {
      log('outdated task; exiting');
      return { state: updatedState };
    }

    // TODO(kuba):
    // - NEEDS esClient here
    // - create the index:
    //   - create a new function in ../../elasticsearch_assets that can create, update, and delete Snapshot Indices with mappings
    //   - call it here
    //   - ERROR if index exists
    // - reindex the entities: snapshot
    //   - update timestamps on reindex because we start AFTER MIDNIGHT !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    // - (later) reindex the entities: reset index
    const taskCompletionTime = moment().utc().toISOString();
    const taskDurationInSeconds = moment(taskCompletionTime).diff(moment(taskStartTime), 'seconds');
    log(`task run completed in ${taskDurationInSeconds} seconds`);

    // TODO(kuba):
    // INTRODUCE NEW TELEMETRY THINGIE
    telemetry.reportEvent(FIELD_RETENTION_ENRICH_POLICY_EXECUTION_EVENT.eventType, {
      duration: taskDurationInSeconds,
      interval: context.taskInstance.schedule?.interval,
    });

    return {
      state: updatedState,
    };
  } catch (e) {
    logger.error(`[Entity Store] [task ${taskId}]: error running task, received ${e.message}`);
    throw e;
  }
}

export async function getEntityStoreSnapshotTaskState({
  namespace,
  entityType,
  taskManager,
}: {
  namespace: string;
  entityType: EntityType;
  taskManager: TaskManagerStartContract;
}) {
  const taskId = getTaskId(namespace, entityType);
  try {
    const taskState = await taskManager.get(taskId);

    return {
      id: taskState.id,
      resource: EngineComponentResourceEnum.task,
      installed: true,
      enabled: taskState.enabled,
      status: taskState.status,
      retryAttempts: taskState.attempts,
      nextRun: taskState.runAt,
      lastRun: taskState.state.lastExecutionTimestamp,
      runs: taskState.state.runs,
    };
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return {
        id: taskId,
        installed: false,
        resource: EngineComponentResourceEnum.task,
      };
    }
    throw e;
  }
}
