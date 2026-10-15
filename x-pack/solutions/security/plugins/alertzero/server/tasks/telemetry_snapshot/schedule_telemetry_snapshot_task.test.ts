/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { TELEMETRY_SNAPSHOT_TASK_ID, TELEMETRY_SNAPSHOT_TASK_TYPE } from './constants';
import { scheduleTelemetrySnapshotTask } from './schedule_telemetry_snapshot_task';

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe('scheduleTelemetrySnapshotTask', () => {
  it('ensures one task every 3 hours with a stable id and an empty initial state', () => {
    const taskManager = taskManagerMock.createStart();

    scheduleTelemetrySnapshotTask({ logger: loggerMock.create(), taskManager });

    expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
      id: TELEMETRY_SNAPSHOT_TASK_ID,
      params: {},
      schedule: { interval: '3h' },
      state: {},
      taskType: TELEMETRY_SNAPSHOT_TASK_TYPE,
    });
  });

  // No `runAt`, so Task Manager runs a newly scheduled task right away, and that first run can
  // send the day's snapshots. `lastSnapshotDay` keeps the later runs that day from sending again.
  it('sets no runAt, so the first run comes right after the task is scheduled', () => {
    const taskManager = taskManagerMock.createStart();

    scheduleTelemetrySnapshotTask({ logger: loggerMock.create(), taskManager });

    expect(taskManager.ensureScheduled.mock.calls[0][0]).not.toHaveProperty('runAt');
  });

  it('logs a scheduling failure instead of rejecting', async () => {
    const taskManager = taskManagerMock.createStart();
    taskManager.ensureScheduled.mockRejectedValue(new Error('no elasticsearch'));
    const logger = loggerMock.create();

    expect(() => scheduleTelemetrySnapshotTask({ logger, taskManager })).not.toThrow();
    await flushPromises();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no elasticsearch'));
  });
});
