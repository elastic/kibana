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
  type LatestTaskStateSchema as EntityStoreHealthTaskState,
} from './state';
import { SCOPE, TIMEOUT, TYPE, VERSION, MAX_ATTEMPTS, SCHEDULE } from './constants';
import { entityStoreTaskLogMessageFactory } from '../utils';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { ENTITY_STORE_HEALTH_REPORT_EVENT } from '../../../../telemetry/event_based/events';

function getTaskId(namespace: string): string {
  return `${TYPE}:${namespace}:${VERSION}`;
}

export function registerEntityStoreHealthTask({
  logger,
  telemetry,
  taskManager,
  getStartServices,
}: {
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  taskManager: TaskManagerSetupContract | undefined;
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
}): void {
  if (!taskManager) {
    logger.warn(
      '[Entity Store]  Task Manager is unavailable; skipping Entity Store health task registration'
    );
    return;
  }

  const esClientGetter = async (): Promise<ElasticsearchClient> => {
    const [coreStart, _] = await getStartServices();
    return coreStart.elasticsearch.client.asInternalUser;
  };

  taskManager.registerTaskDefinitions({
    [TYPE]: {
      title: 'Entity Store health task',
      description: `Sends telemetry events on Entity Store health every 1h`,
      timeout: TIMEOUT,
      maxAttempts: MAX_ATTEMPTS,
      stateSchemaByVersion,
      createTaskRunner: (context: RunContext) => {
        return {
          async run() {
            return runTask({
              logger,
              telemetry,
              context,
              esClientGetter,
            });
          },
          async cancel() {
            logger.warn(`[Entity Store]  Task ${TYPE} timed out`);
          },
        };
      },
    },
  });
}

export async function startEntityStoreHealthTask({
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
  const msg = entityStoreTaskLogMessageFactory(taskId);

  logger.info(msg('attempting to schedule'));
  try {
    const task = await taskManager.ensureScheduled({
      id: taskId,
      taskType: TYPE,
      scope: SCOPE,
      schedule: SCHEDULE,
      state: { ...defaultState, namespace },
      params: {
        version: VERSION,
        namespace,
        entityType,
      },
    });
    logger.info(msg(`scheduled with ${JSON.stringify(task.schedule)}`));
  } catch (e) {
    logger.error(msg(`error scheduling task, received ${e.message}`));
    throw e;
  }
}

export async function removeEntityStoreHealthTask({
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
  const msg = entityStoreTaskLogMessageFactory(taskId);
  try {
    await taskManager.remove(getTaskId(namespace, entityType));
    logger.info(msg(`removed health task`));
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(msg(`failed to remove health task: ${err.message}`));
      throw err;
    }
  }
}

export async function runTask({
  logger,
  telemetry,
  context,
  esClientGetter,
}: {
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  context: RunContext;
  esClientGetter: () => Promise<ElasticsearchClient>;
}): Promise<{
  state: EntityStoreHealthTaskState;
}> {
  const state = context.taskInstance.state as EntityStoreHealthTaskState;
  const taskId: string = context.taskInstance.id;
  const abort: AbortController = context.abortController;
  const msg = entityStoreTaskLogMessageFactory(taskId);
  const esClient: ElasticsearchClient = await esClientGetter();
  const event = {};
  const taskStartTime = moment().utc();
  try {
    // TODO
    telemetry.reportEvent(ENTITY_STORE_HEALTH_REPORT_EVENT.eventType, event);
    return {
      state: updatedState,
    };
  } catch (e) {
    logger.error(msg(`error running task, received ${e.message}`));
    throw e;
  }
}

export async function getEntityStoreHealthTaskState({
  namespace,
  taskManager,
}: {
  namespace: string;
  taskManager: TaskManagerStartContract;
}) {
  const taskId = getTaskId(namespace);
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
