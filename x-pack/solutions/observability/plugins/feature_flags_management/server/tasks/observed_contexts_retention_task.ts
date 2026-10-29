/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { Duration } from 'moment';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority, throwRetryableError } from '@kbn/task-manager-plugin/server';
import { OBSERVED_CONTEXTS_INDEX } from '../storage/indices';

export const RETENTION_TASK_TYPE = 'feature-flags-management:observed-contexts-retention';
export const RETENTION_TASK_ID = RETENTION_TASK_TYPE;
const RETENTION_TASK_INTERVAL = '1h';

interface RetentionTaskDeps {
  logger: Logger;
  retention: Duration;
  getEsClient: () => Promise<ElasticsearchClient>;
  now?: () => Date;
}

/** Deletes observed contexts whose `last_seen` is older than the configured retention. */
export const runRetention = async (
  { logger, retention, getEsClient, now = () => new Date() }: RetentionTaskDeps,
  signal: AbortSignal
): Promise<void> => {
  const esClient = await getEsClient();
  const cutoff = new Date(now().getTime() - retention.asMilliseconds()).toISOString();
  try {
    const result = await esClient.deleteByQuery(
      {
        index: OBSERVED_CONTEXTS_INDEX,
        ignore_unavailable: true,
        conflicts: 'proceed',
        query: { range: { last_seen: { lt: cutoff } } },
      },
      { signal }
    );
    logger.debug(`Deleted ${result.deleted ?? 0} observed contexts last seen before ${cutoff}`);
  } catch (error) {
    if (signal.aborted || error instanceof errors.RequestAbortedError) {
      logger.debug('Observed contexts retention was aborted; it runs again on the next interval');
      return;
    }
    throwRetryableError(
      new Error(`Unable to apply the observed contexts retention: ${error.message}`),
      true
    );
  }
};

export const registerRetentionTask = (
  taskManager: TaskManagerSetupContract,
  deps: RetentionTaskDeps
): void => {
  taskManager.registerTaskDefinitions({
    [RETENTION_TASK_TYPE]: {
      title: 'Feature flags: observed contexts retention',
      description:
        'Deletes the evaluation contexts reported by Fleet Server that were not seen within xpack.featureFlagsManagement.observedContexts.retention.',
      timeout: '2m',
      cost: TaskCost.Normal,
      priority: TaskPriority.Maintenance,
      createTaskRunner: ({ signal }: RunContext) => ({
        run: async () => {
          await runRetention(deps, signal);
          return { state: {} };
        },
      }),
    },
  });
};

export const scheduleRetentionTask = async (
  taskManager: TaskManagerStartContract,
  logger: Logger
): Promise<void> => {
  try {
    await taskManager.ensureScheduled({
      id: RETENTION_TASK_ID,
      taskType: RETENTION_TASK_TYPE,
      schedule: { interval: RETENTION_TASK_INTERVAL },
      params: {},
      state: {},
    });
  } catch (error) {
    logger.error(`Unable to schedule the observed contexts retention task: ${error.message}`);
  }
};
