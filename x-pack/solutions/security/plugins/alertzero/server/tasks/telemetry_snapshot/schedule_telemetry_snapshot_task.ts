/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import {
  TELEMETRY_SNAPSHOT_INTERVAL,
  TELEMETRY_SNAPSHOT_TASK_ID,
  TELEMETRY_SNAPSHOT_TASK_TYPE,
} from './constants';
import { EMPTY_TELEMETRY_SNAPSHOT_STATE } from './state';

/** Ensures the one daily snapshot task instance exists; a failure is logged, never rejected. */
export const scheduleTelemetrySnapshotTask = ({
  logger,
  taskManager,
}: {
  logger: Logger;
  taskManager: Pick<TaskManagerStartContract, 'ensureScheduled'>;
}): void => {
  taskManager
    .ensureScheduled({
      id: TELEMETRY_SNAPSHOT_TASK_ID,
      params: {},
      schedule: { interval: TELEMETRY_SNAPSHOT_INTERVAL },
      state: EMPTY_TELEMETRY_SNAPSHOT_STATE,
      taskType: TELEMETRY_SNAPSHOT_TASK_TYPE,
    })
    .catch((error) => {
      logger.warn(
        `Failed to schedule the AlertZero telemetry snapshot task: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });
};
