/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type {
  ConcreteTaskInstance,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SyntheticsServerSetup } from '../types';
import { sendErrorTelemetryEvents } from '../routes/telemetry/monitor_upgrade_sender';
import type { MonitorSyncState } from './incremental_sync';

// These identify the task in Task Manager's saved objects, so they must never change.
export const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE =
  'UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects';
export const SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID = 'UPTIME:SyntheticsService:sync-task';
const SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT = '5m';

interface MonitorSyncTaskOptions {
  server: SyntheticsServerSetup;
  /** How often the task runs, e.g. `5m`. */
  syncInterval?: string;
}

/**
 * Stamps `lastRunAt` on the task state and warns when the previous run was long enough ago
 * to have missed its schedule.
 */
export const recordRun = (
  state: MonitorSyncState,
  { server, syncInterval }: MonitorSyncTaskOptions
) => {
  const { logger } = server;

  try {
    const { lastRunAt } = state;
    const current = moment();

    if (lastRunAt) {
      // log if it has missed last schedule
      const diff = moment(current).diff(lastRunAt, 'minutes');
      const allowedMinutes = Number((syncInterval ?? '5m').split('m')[0]) + 5;
      if (diff > allowedMinutes) {
        const message = `Synthetics monitor sync task has missed its schedule, it last ran ${diff} minutes ago.`;
        logger.warn(message);
        sendErrorTelemetryEvents(logger, server.telemetry, {
          message,
          reason: 'Failed to run synthetics sync task on schedule',
          type: 'syncTaskMissedSchedule',
          stackVersion: server.stackVersion,
        });
      }
      logger.debug(`Synthetics monitor sync task last ran ${diff} minutes ago.`);
    }
    state.lastRunAt = current.toISOString();
  } catch (e) {
    logger.error(e);
  }
};

/** Registers the recurring task that periodically pushes every saved monitor to the service. */
export const registerMonitorSyncTask = ({
  taskManager,
  runSync,
  ...options
}: MonitorSyncTaskOptions & {
  taskManager: TaskManagerSetupContract;
  /** The work of one run. Failures are reported and do not stop later runs. */
  runSync: (state: MonitorSyncState) => Promise<void>;
}) => {
  const { server } = options;
  const interval = options.syncInterval ?? SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT;

  taskManager.registerTaskDefinitions({
    [SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE]: {
      title: 'Synthetics Service - Sync Saved Monitors',
      description: 'This task periodically pushes saved monitors to Synthetics Service.',
      timeout: '2m',
      maxAttempts: 3,

      createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
        return {
          // Perform the work of the task. The return value should fit the TaskResult interface.
          async run() {
            const { state } = taskInstance;
            server.logger.debug(`Running synthetics monitors sync task.`);
            recordRun(state, options);
            try {
              await runSync(state);
            } catch (e) {
              sendErrorTelemetryEvents(server.logger, server.telemetry, {
                reason: 'Failed to run scheduled sync task',
                message: e?.message,
                type: 'runTaskError',
                code: e?.code,
                status: e.status,
                stackVersion: server.stackVersion,
              });
              server.logger.error(e);
            }

            return { state, schedule: { interval } };
          },
          async cancel() {
            server.logger?.warn(`Task ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID} timed out`);
          },
        };
      },
    },
  });
};

export const scheduleMonitorSyncTask = async ({
  taskManager,
  server,
  syncInterval,
}: MonitorSyncTaskOptions & {
  taskManager: TaskManagerStartContract;
}): Promise<TaskInstance | null> => {
  const interval = syncInterval ?? SYNTHETICS_SERVICE_SYNC_INTERVAL_DEFAULT;

  try {
    const taskInstance = await taskManager.ensureScheduled({
      id: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID,
      taskType: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE,
      schedule: {
        interval,
      },
      params: {},
      state: {},
      scope: ['uptime'],
    });

    server.logger?.info(
      `Task ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID} scheduled with interval ${taskInstance.schedule?.interval}.`
    );

    return taskInstance;
  } catch (e) {
    sendErrorTelemetryEvents(server.logger, server.telemetry, {
      reason: 'Failed to schedule sync task',
      message: e?.message ?? e,
      type: 'scheduleTaskError',
      code: e?.code,
      status: e.status,
      stackVersion: server.stackVersion,
    });

    server.logger?.error(e);

    server.logger?.error(
      `Error running synthetics syncs task: ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID}, ${e?.message}`
    );

    return null;
  }
};
