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
  SCHEDULE,
} from './constants';
import { createEntitySnapshotIndex } from '../../elasticsearch_assets/entity_snapshot_index';
import { getEntitiesIndexName, getEntitiesResetIndexName } from '../../utils';
import { FIELD_RETENTION_ENRICH_POLICY_EXECUTION_EVENT } from '../../../../telemetry/event_based/events';
import { entityStoreTaskLogFactory, entityStoreTaskDebugLogFactory } from '../utils';
import type { EntityAnalyticsRoutesDeps } from '../../../types';

function getTaskId(namespace: string, entityType: EntityType): string {
  return `${TYPE}:${entityType}:${namespace}:${VERSION}`;
}

export async function registerEntityStoreSnapshotTask({
  getStartServices,
  logger,
  telemetry,
  taskManager,
}: {
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  taskManager: TaskManagerSetupContract | undefined;
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
}): Promise<void> {
  if (!taskManager) {
    logger.warn(
      '[Entity Store]  Task Manager is unavailable; skipping Entity Store snapshot task registration'
    );
    return;
  }
  const [coreStart, _] = await getStartServices();
  const esClient = coreStart.elasticsearch.client.asInternalUser;

  taskManager.registerTaskDefinitions({
    [TYPE]: {
      title: 'Entity Store snapshot task',
      description: `Creates a snapshot every 24h and handles additional data transformations.`,
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
      taskType: TYPE,
      scope: SCOPE,
      schedule: SCHEDULE,
      state: { ...defaultState, namespace, entityType },
      params: {
        version: VERSION,
        namespace,
        entityType,
      },
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
  esClient,
}: {
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  context: RunContext;
  esClient: ElasticsearchClient;
}): Promise<{
  state: EntityStoreFieldRetentionTaskState;
}> {
  const state = context.taskInstance.state as EntityStoreFieldRetentionTaskState;
  const taskId = context.taskInstance.id;
  const log = entityStoreTaskLogFactory(logger, taskId);
  const debugLog = entityStoreTaskDebugLogFactory(logger, taskId);
  try {
    const taskStartTime = moment().utc();
    const snapshotDate = rewindToYesterday(taskStartTime.toDate());
    log('running task');

    const entityType = context.taskInstance.params.entityType as EntityType;
    if (entityType === '') {
      const err = `Task ${taskId} expected vaild entityType in params, got ""`;
      log(err);
      throw err;
    }
    const namespace = context.taskInstance.params.namespace as string;
    if (namespace === '') {
      const err = `Task ${taskId} expected vaild namespace in params, got ""`;
      log(err);
      throw err;
    }
    const updatedState = {
      lastExecutionTimestamp: taskStartTime.toISOString(),
      lastSnapshotTookSeconds: 0,
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
    debugLog('creating snapshot index');
    const { index: snapshotIndex } = await createEntitySnapshotIndex({
      esClient,
      entityType,
      namespace,
      snapshotDate,
    });
    // - reindex the entities: snapshot
    //   - DO WE? update timestamps on reindex because we start AFTER MIDNIGHT
    // TODO(kuba): potential for running a script, modifying docs
    debugLog(`reindexing entities to ${snapshotIndex}`);
    await esClient.reindex({
      source: {
        index: [getEntitiesIndexName(entityType, namespace)],
      },
      dest: {
        index: snapshotIndex,
      },
      conflicts: 'proceed',
    });

    // - (later) reindex the entities: reset index
    const resetIndex = getEntitiesResetIndexName(entityType, namespace);
    debugLog(`reindexing entities to ${resetIndex}`);
    await esClient.reindex({
      source: {
        index: [getEntitiesIndexName(entityType, namespace)],
      },
      dest: {
        index: resetIndex,
      },
      conflicts: 'proceed',
      script: {
        source: `
          // Create a new map to hold the filtered fields
          Map newDoc = new HashMap();

          // Keep the entity.id field
          if (ctx._source.entity?.id != null) {
            newDoc.entity = new HashMap();
            newDoc.entity.id = ctx._source.entity.id;
          }

          // Set the @timestamp field to the current time
          newDoc['@timestamp'] = Instant.now().toString();

          // Set the entity.last_seen_timestamp field to the current time
          if (newDoc.entity != null) {
            newDoc.entity.last_seen_timestamp = Instant.now().toString();
          }

          // Replace the existing document with the new filtered document
          ctx._source = newDoc;
        `,
        lang: 'painless',
      },
    });

    const taskCompletionTime = moment().utc().toISOString();
    const taskDurationInSeconds = moment(taskCompletionTime).diff(moment(taskStartTime), 'seconds');
    updatedState.lastSnapshotTookSeconds = taskDurationInSeconds;
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

/**
 * Takes a date and returns a date just before midnight the day before. We run
 * snapshot task just after midnight, so we effectively need previous day's
 * date.
 * @param d - The date snapshot task started
 * @returns d - 1 day
 */
function rewindToYesterday(d: Date): Date {
  const yesterday = new Date(d);
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCSeconds(d.getUTCSeconds() - 60);
  return yesterday;
}

/**
 * Takes a date and returns a date just before midnight the day before. We run
 * snapshot task just after midnight, so we effectively need previous day's
 * date.
 * @param d - The date snapshot task started
 * @returns d - 1 day
 */
function rewindMomentToYesterday(d: moment.Moment): moment.Moment {
  return d.clone().utc().startOf('day').subtract(1, 'minute');
}
