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
import type { ReindexResponse } from '@elastic/elasticsearch/lib/api/types';
import { flow } from 'lodash';
import type { EntityType } from '../../../../../../common/api/entity_analytics/entity_store';
import { EngineComponentResourceEnum } from '../../../../../../common/api/entity_analytics/entity_store';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as EntityStoreSnapshotTaskState,
} from './state';
import { SCOPE, TIMEOUT, TYPE, VERSION, MAX_ATTEMPTS, SCHEDULE } from './constants';
import { createEntitySnapshotIndex } from '../../elasticsearch_assets/entity_snapshot_index';
import { getEntitiesIndexName, getEntitiesResetIndexName } from '../../utils';
import { entityStoreTaskLogMessageFactory } from '../utils';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { ENTITY_STORE_SNAPSHOT_TASK_EXECUTION_EVENT } from '../../../../telemetry/event_based/events';

function getTaskId(namespace: string, entityType: EntityType): string {
  return `${TYPE}:${entityType}:${namespace}:${VERSION}`;
}

const removeNewlines = (content: string) => content.replace(/\n/g, '');
const condenseMultipleSpaces = (content: string) => content.replace(/\s+/g, ' ');
const removeComments = (content: string) => content.replace(/\/\/.*/g, '');
const minifyPainless = flow(removeComments, removeNewlines, condenseMultipleSpaces);

export function registerEntityStoreSnapshotTask({
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
      '[Entity Store]  Task Manager is unavailable; skipping Entity Store snapshot task registration'
    );
    return;
  }

  const esClientGetter = async (): Promise<ElasticsearchClient> => {
    const [coreStart, _] = await getStartServices();
    return coreStart.elasticsearch.client.asInternalUser;
  };

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
            return runSnapshotTask({
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
  const msg = entityStoreTaskLogMessageFactory(taskId);

  logger.info(msg('attempting to schedule'));
  try {
    const task = await taskManager.ensureScheduled({
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
    logger.info(msg(`scheduled with ${JSON.stringify(task.schedule)}`));
  } catch (e) {
    logger.error(msg(`error scheduling task, received ${e.message}`));
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
  const taskId = getTaskId(namespace, entityType);
  const msg = entityStoreTaskLogMessageFactory(taskId);
  try {
    await taskManager.remove(getTaskId(namespace, entityType));
    logger.info(msg(`removed snapshot task`));
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(msg(`failed to remove snapshot task: ${err.message}`));
      throw err;
    }
  }
}

// removeAllFieldsAndResetTimestamp is a painless function that takes a document,
// strips it of all its fields (except for identity fields, like host.name or entity.id),
// and sets the timestamps to @now. The result is used as a script in reindex operation.
const removeAllFieldsAndResetTimestamp: string = minifyPainless(`
    // Create a new map to hold the filtered fields
    Map newDoc = new HashMap();

    // Keep the entity.id field
    newDoc.entity = new HashMap();
    if (ctx._source.entity?.id != null) {
      newDoc.entity.id = ctx._source.entity.id;
    }
    // Keep host/user/service identity fields if present
    if (ctx._source[params.entityType]?.name != null) {
      newDoc[params.entityType] = new HashMap();
      newDoc[params.entityType].name = ctx._source[params.entityType].name;
    }

    // Set the @timestamp field to the current time
    newDoc['@timestamp'] = params.timestampNow;

    // Set the entity.last_seen_timestamp field to the current time
    newDoc.entity.last_seen_timestamp = params.timestampNow;

    // Reset entity.behaviors fields if they exist
    if (ctx._source.entity?.behaviors != null) {
      if (params.entityType == 'generic') {
        newDoc.entity.behaviors = new HashMap();
        for (String key : ctx._source.entity.behaviors.keySet()) {
          def value = ctx._source.entity.behaviors[key];
          if (value instanceof Boolean || value == 'true') {
            newDoc.entity.behaviors[key] = false;
          }
        }
      } else {
        newDoc[params.entityType].entity = new HashMap();
        newDoc[params.entityType].entity.behaviors = new HashMap();
        for (String key : ctx._source.entity.behaviors.keySet()) {
          def value = ctx._source.entity.behaviors[key];
          if (value instanceof Boolean || value == 'true') {
            newDoc[params.entityType].entity.behaviors[key] = false;
          }
        }
      }
    }

    // Replace the existing document with the new filtered document
    ctx._source = newDoc;
    `);

export async function runSnapshotTask({
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
  state: EntityStoreSnapshotTaskState;
}> {
  const state = context.taskInstance.state as EntityStoreSnapshotTaskState;
  const taskId: string = context.taskInstance.id;
  const abort: AbortController = context.abortController;
  const msg = entityStoreTaskLogMessageFactory(taskId);
  const esClient: ElasticsearchClient = await esClientGetter();
  const taskStartTime = moment().utc();
  const snapshotDate = rewindToYesterday(taskStartTime.toDate());
  const event = {
    entityType: '',
    namespace: '',
    snapshotDate,
    snapshotIndex: '',
    entityCount: 0,
    durationMs: 0,
    success: false,
    errorMessage: '',
  };

  try {
    logger.info(msg('running task'));

    const entityType = context.taskInstance.params.entityType as EntityType;
    const namespace = context.taskInstance.params.namespace as string;
    event.entityType = entityType;
    event.namespace = namespace;

    if (namespace === '') {
      const err = `Task ${taskId} expected vaild namespace in params, got ""`;
      logger.error(msg(err));
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
      logger.warn(msg('outdated task; exiting'));
      return { state: updatedState };
    }

    logger.info(msg('creating snapshot index'));
    const { index: snapshotIndex } = await createEntitySnapshotIndex({
      esClient,
      entityType,
      namespace,
      snapshotDate,
    });
    event.snapshotIndex = snapshotIndex;

    logger.info(msg(`reindexing entities to ${snapshotIndex}`));
    const snapshotReindexResponse = await esClient.reindex(
      {
        source: {
          index: [getEntitiesIndexName(entityType, namespace)],
        },
        dest: {
          index: snapshotIndex,
        },
        conflicts: 'proceed',
      },
      { signal: abort.signal }
    );
    logger.info(
      msg(`reindexed to ${snapshotIndex}: ${prettyReindexResponse(snapshotReindexResponse)}`)
    );
    event.entityCount = snapshotReindexResponse.created ?? 0;

    const resetIndex = getEntitiesResetIndexName(entityType, namespace);
    logger.info(msg(`removing old entries from ${resetIndex}`));
    const cleanResetResponse = await esClient.deleteByQuery(
      {
        index: resetIndex,
        query: {
          match_all: {},
        },
        refresh: true,
      },
      { signal: abort.signal }
    );
    logger.info(msg(`removed ${cleanResetResponse.deleted} old entries from ${resetIndex}`));

    logger.info(msg(`reindexing entities to ${resetIndex}`));
    const resetReindexResponse = await esClient.reindex(
      {
        source: {
          index: [getEntitiesIndexName(entityType, namespace)],
        },
        dest: {
          index: resetIndex,
        },
        conflicts: 'proceed',
        script: {
          source: removeAllFieldsAndResetTimestamp,
          lang: 'painless',
          params: {
            entityType,
            timestampNow: new Date().toISOString(),
          },
        },
      },
      { signal: abort.signal }
    );
    logger.info(msg(`reindexed to ${resetIndex}: ${prettyReindexResponse(resetReindexResponse)}`));

    const taskCompletionTime = moment().utc().toISOString();
    const taskDurationInSeconds = moment(taskCompletionTime).diff(moment(taskStartTime), 'seconds');
    updatedState.lastSnapshotTookSeconds = taskDurationInSeconds;
    logger.info(msg(`task run completed in ${taskDurationInSeconds} seconds`));
    event.durationMs = moment(taskCompletionTime).diff(moment(taskStartTime));
    event.success = true;

    telemetry.reportEvent(ENTITY_STORE_SNAPSHOT_TASK_EXECUTION_EVENT.eventType, event);

    return {
      state: updatedState,
    };
  } catch (e) {
    logger.error(msg(`error running task, received ${e.message}`));
    event.errorMessage = e.message;
    event.durationMs = moment(moment.utc()).diff(moment(taskStartTime));
    telemetry.reportEvent(ENTITY_STORE_SNAPSHOT_TASK_EXECUTION_EVENT.eventType, event);
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
export function rewindToYesterday(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - 1));
}

function prettyReindexResponse(resp: ReindexResponse): string {
  const { created, deleted, noops, failures, version_conflicts: versionConflicts, retries } = resp;
  return JSON.stringify({ created, deleted, noops, failures, versionConflicts, retries });
}
