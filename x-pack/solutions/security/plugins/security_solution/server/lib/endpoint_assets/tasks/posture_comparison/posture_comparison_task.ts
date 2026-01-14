/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type {
  AnalyticsServiceSetup,
  ElasticsearchClient,
  Logger,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as PostureComparisonTaskState,
} from './state';
import {
  SCOPE,
  TIMEOUT,
  TYPE,
  VERSION,
  MAX_ATTEMPTS,
  SCHEDULE,
  POSTURE_COMPARISON_FIELDS,
  POSTURE_FIELD_TO_DRIFT_TYPE,
} from './constants';
import { getDriftEventsIndexPattern } from '../../transforms/drift_events_index';
import type { GetStartServicesFunction } from '../../../entity_analytics/types';

function getTaskId(namespace: string): string {
  return `${TYPE}:${namespace}:${VERSION}`;
}

const taskLogMessageFactory =
  (taskId: string) =>
  (message: string): string => {
    return `[Endpoint Assets] [Posture Comparison Task ${taskId}]: ${message}`;
  };

interface PostureSnapshot {
  host_id: string;
  host_name: string;
  disk_encryption?: string;
  firewall_enabled?: boolean;
  secure_boot?: boolean;
  score?: number;
}

interface PostureChange {
  host_id: string;
  host_name: string;
  field: string;
  current_value: string;
  previous_value: string;
  item_type: string;
}

export function registerPostureComparisonTask({
  logger,
  telemetry,
  taskManager,
  getStartServices,
}: {
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  taskManager: TaskManagerSetupContract | undefined;
  getStartServices: GetStartServicesFunction;
}): void {
  if (!taskManager) {
    logger.warn(
      '[Endpoint Assets] Task Manager is unavailable; skipping Posture Comparison task registration'
    );
    return;
  }

  const esClientGetter = async (): Promise<ElasticsearchClient> => {
    const [coreStart] = await getStartServices();
    return coreStart.elasticsearch.client.asInternalUser;
  };

  taskManager.registerTaskDefinitions({
    [TYPE]: {
      title: 'Endpoint Assets Posture Comparison task',
      description: `Compares daily posture snapshots to detect security posture changes and generates drift events.`,
      timeout: TIMEOUT,
      maxAttempts: MAX_ATTEMPTS,
      stateSchemaByVersion,
      createTaskRunner: (context: RunContext) => {
        return {
          async run() {
            return runPostureComparisonTask({
              logger,
              telemetry,
              context,
              esClientGetter,
            });
          },
          async cancel() {
            logger.warn(`[Endpoint Assets] Task ${TYPE} timed out`);
          },
        };
      },
    },
  });
}

export async function startPostureComparisonTask({
  logger,
  namespace,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}) {
  const taskId = getTaskId(namespace);
  const msg = taskLogMessageFactory(taskId);

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
      },
    });
    logger.info(msg(`scheduled with ${JSON.stringify(task.schedule)}`));
  } catch (e) {
    logger.error(msg(`error scheduling task, received ${e.message}`));
    throw e;
  }
}

export async function removePostureComparisonTask({
  logger,
  namespace,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}) {
  const taskId = getTaskId(namespace);
  const msg = taskLogMessageFactory(taskId);
  try {
    await taskManager.remove(taskId);
    logger.info(msg(`removed posture comparison task`));
  } catch (err) {
    const SavedObjectsErrorHelpers = await import('@kbn/core-saved-objects-utils-server').then(
      (m) => m.SavedObjectsErrorHelpers
    );
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(msg(`failed to remove posture comparison task: ${err.message}`));
      throw err;
    }
  }
}

async function runPostureComparisonTask({
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
  state: PostureComparisonTaskState;
}> {
  const state = context.taskInstance.state as PostureComparisonTaskState;
  const taskId: string = context.taskInstance.id;
  const abort: AbortController = context.abortController;
  const msg = taskLogMessageFactory(taskId);
  const esClient: ElasticsearchClient = await esClientGetter();
  const taskStartTime = moment().utc();

  try {
    logger.info(msg('running task'));

    const namespace = context.taskInstance.params.namespace as string;

    if (!namespace || namespace === '') {
      const err = `Task ${taskId} expected valid namespace in params, got "${namespace}"`;
      logger.error(msg(err));
      throw new Error(err);
    }

    const updatedState: PostureComparisonTaskState = {
      lastExecutionTimestamp: taskStartTime.toISOString(),
      lastComparisonTookSeconds: 0,
      namespace,
      runs: state.runs + 1,
      hostsCompared: 0,
      driftEventsGenerated: 0,
    };

    logger.info(msg('querying current and previous posture snapshots'));

    const currentSnapshots = await queryPostureSnapshots(
      esClient,
      namespace,
      'now-1d/d',
      'now/d',
      abort.signal,
      logger,
      msg
    );

    const previousSnapshots = await queryPostureSnapshots(
      esClient,
      namespace,
      'now-2d/d',
      'now-1d/d',
      abort.signal,
      logger,
      msg
    );

    logger.info(
      msg(
        `found ${Object.keys(currentSnapshots).length} current and ${Object.keys(previousSnapshots).length} previous snapshots`
      )
    );

    const changes: PostureChange[] = [];

    for (const [hostId, current] of Object.entries(currentSnapshots)) {
      const previous = previousSnapshots[hostId];

      if (!previous) {
        logger.debug(msg(`no previous snapshot for host ${hostId}, skipping comparison`));
        continue;
      }

      for (const field of POSTURE_COMPARISON_FIELDS) {
        const fieldKey = field.split('.').pop() as keyof PostureSnapshot;
        const currentValue = current[fieldKey];
        const previousValue = previous[fieldKey];

        if (currentValue !== previousValue && currentValue !== undefined) {
          const itemType = POSTURE_FIELD_TO_DRIFT_TYPE[field] || fieldKey;

          changes.push({
            host_id: hostId,
            host_name: current.host_name || hostId,
            field,
            current_value: String(currentValue),
            previous_value: String(previousValue ?? 'unknown'),
            item_type: itemType,
          });

          logger.debug(
            msg(
              `detected change for ${hostId}: ${field} changed from "${previousValue}" to "${currentValue}"`
            )
          );
        }
      }
    }

    updatedState.hostsCompared = Object.keys(currentSnapshots).length;
    updatedState.driftEventsGenerated = changes.length;

    if (changes.length > 0) {
      logger.info(msg(`indexing ${changes.length} posture drift events`));
      await indexPostureDriftEvents(esClient, namespace, changes, abort.signal, logger, msg);
      logger.info(msg(`successfully indexed ${changes.length} drift events`));
    } else {
      logger.info(msg('no posture changes detected'));
    }

    const taskCompletionTime = moment().utc();
    const taskDurationInSeconds = taskCompletionTime.diff(taskStartTime, 'seconds');
    updatedState.lastComparisonTookSeconds = taskDurationInSeconds;

    logger.info(msg(`task run completed in ${taskDurationInSeconds} seconds`));

    return {
      state: updatedState,
    };
  } catch (e) {
    logger.error(msg(`error running task, received ${e.message}`));
    throw e;
  }
}

async function queryPostureSnapshots(
  esClient: ElasticsearchClient,
  namespace: string,
  fromTime: string,
  toTime: string,
  signal: AbortSignal,
  logger: Logger,
  msg: (message: string) => string
): Promise<Record<string, PostureSnapshot>> {
  const indexPattern = `endpoint-assets-osquery-${namespace}`;

  try {
    const response = await esClient.search(
      {
        index: indexPattern,
        size: 10000,
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: fromTime,
                    lt: toTime,
                  },
                },
              },
              {
                exists: {
                  field: 'host.id',
                },
              },
            ],
          },
        },
        _source: [
          'host.id',
          'host.name',
          'endpoint.posture.disk_encryption',
          'endpoint.posture.firewall_enabled',
          'endpoint.posture.secure_boot',
          'endpoint.posture.score',
        ],
        collapse: {
          field: 'host.id',
          inner_hits: {
            name: 'latest',
            size: 1,
            sort: [{ '@timestamp': 'desc' }],
          },
        },
      },
      { signal }
    );

    const snapshots: Record<string, PostureSnapshot> = {};

    for (const hit of response.hits.hits) {
      const source = hit._source as Record<string, unknown>;
      const hostId = source.host?.id as string;

      if (hostId) {
        snapshots[hostId] = {
          host_id: hostId,
          host_name: (source.host?.name as string) || hostId,
          disk_encryption: source.endpoint?.posture?.disk_encryption as string | undefined,
          firewall_enabled: source.endpoint?.posture?.firewall_enabled as boolean | undefined,
          secure_boot: source.endpoint?.posture?.secure_boot as boolean | undefined,
          score: source.endpoint?.posture?.score as number | undefined,
        };
      }
    }

    return snapshots;
  } catch (e) {
    if (e.meta?.statusCode === 404) {
      logger.warn(msg(`index ${indexPattern} not found, returning empty snapshots`));
      return {};
    }
    throw e;
  }
}

async function indexPostureDriftEvents(
  esClient: ElasticsearchClient,
  namespace: string,
  changes: PostureChange[],
  signal: AbortSignal,
  logger: Logger,
  msg: (message: string) => string
): Promise<void> {
  const driftEventsIndex = getDriftEventsIndexPattern(namespace);
  const timestamp = new Date().toISOString();

  const operations = changes.flatMap((change) => [
    { index: { _index: driftEventsIndex } },
    {
      '@timestamp': timestamp,
      host: {
        id: change.host_id,
        name: change.host_name,
      },
      drift: {
        category: 'posture',
        action: 'changed',
        severity: determineSeverity(change),
        item: {
          type: change.item_type,
          name: change.item_type,
          value: change.current_value,
          previous_value: change.previous_value,
        },
        query_id: 'posture-comparison-task',
        query_name: 'Daily Posture Comparison',
      },
      event: {
        kind: 'event',
        category: ['configuration'],
        type: ['change'],
        action: 'posture_changed',
      },
    },
  ]);

  try {
    const response = await esClient.bulk(
      {
        operations,
        refresh: false,
      },
      { signal }
    );

    if (response.errors) {
      const errorCount = response.items.filter((item) => item.index?.error).length;
      logger.warn(msg(`bulk indexing completed with ${errorCount} errors`));
    }
  } catch (e) {
    logger.error(msg(`failed to bulk index drift events: ${e.message}`));
    throw e;
  }
}

function determineSeverity(change: PostureChange): 'low' | 'medium' | 'high' | 'critical' {
  if (change.field === 'endpoint.posture.disk_encryption') {
    if (change.current_value === 'FAIL') {
      return 'critical';
    }
    return 'high';
  }

  if (change.field === 'endpoint.posture.firewall_enabled') {
    if (change.current_value === 'false' || change.current_value === '0') {
      return 'critical';
    }
    return 'high';
  }

  if (change.field === 'endpoint.posture.secure_boot') {
    if (change.current_value === 'false' || change.current_value === '0') {
      return 'high';
    }
    return 'medium';
  }

  if (change.field === 'endpoint.posture.score') {
    const currentScore = parseInt(change.current_value, 10);
    const previousScore = parseInt(change.previous_value, 10);

    if (isNaN(currentScore) || isNaN(previousScore)) {
      return 'medium';
    }

    const scoreDrop = previousScore - currentScore;

    if (scoreDrop >= 30) {
      return 'critical';
    }
    if (scoreDrop >= 20) {
      return 'high';
    }
    if (scoreDrop >= 10) {
      return 'medium';
    }
    return 'low';
  }

  return 'medium';
}

export async function getPostureComparisonTaskState({
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
      installed: true,
      enabled: taskState.enabled,
      status: taskState.status,
      retryAttempts: taskState.attempts,
      nextRun: taskState.runAt,
      lastRun: taskState.state.lastExecutionTimestamp,
      runs: taskState.state.runs,
      hostsCompared: taskState.state.hostsCompared,
      driftEventsGenerated: taskState.state.driftEventsGenerated,
    };
  } catch (e) {
    const SavedObjectsErrorHelpers = await import('@kbn/core-saved-objects-utils-server').then(
      (m) => m.SavedObjectsErrorHelpers
    );
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return {
        id: taskId,
        installed: false,
      };
    }
    throw e;
  }
}
