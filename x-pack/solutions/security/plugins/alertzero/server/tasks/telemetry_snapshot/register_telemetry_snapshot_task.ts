/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  TaskCost,
  TaskPriority,
  type TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { TELEMETRY_SNAPSHOT_TASK_TYPE, TELEMETRY_SNAPSHOT_TIMEOUT } from './constants';
import { runTelemetrySnapshot } from './run_telemetry_snapshot';
import { TELEMETRY_SNAPSHOT_STATE_SCHEMA_BY_VERSION, toTelemetrySnapshotTaskState } from './state';
import type { TelemetrySnapshotDependencies } from './types';

/** Registers the daily AlertZero telemetry snapshot task type; call it once in `setup()`. */
export const registerTelemetrySnapshotTask = ({
  getDependencies,
  logger,
  taskManager,
}: {
  getDependencies: () => Promise<TelemetrySnapshotDependencies>;
  logger: Logger;
  taskManager: Pick<TaskManagerSetupContract, 'registerTaskDefinitions'>;
}): void => {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_SNAPSHOT_TASK_TYPE]: {
      title: 'AlertZero telemetry snapshot',
      description:
        'Reports the daily cluster-level AlertZero Worker autonomy and feature flag snapshots through EBT.',
      // Bookkeeping that may wait under load: a handful of reads per space, once a day.
      cost: TaskCost.Normal,
      priority: TaskPriority.Maintenance,
      stateSchemaByVersion: TELEMETRY_SNAPSHOT_STATE_SCHEMA_BY_VERSION,
      timeout: TELEMETRY_SNAPSHOT_TIMEOUT,
      createTaskRunner: ({ signal, taskInstance }) => ({
        run: async () =>
          runTelemetrySnapshot({
            getDependencies,
            logger,
            now: new Date(),
            signal,
            state: toTelemetrySnapshotTaskState(taskInstance.state),
          }),
      }),
    },
  });
};
