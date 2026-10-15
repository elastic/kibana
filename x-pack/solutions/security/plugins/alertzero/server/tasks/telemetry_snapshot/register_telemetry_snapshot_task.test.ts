/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { TELEMETRY_SNAPSHOT_TASK_TYPE } from './constants';
import { registerTelemetrySnapshotTask } from './register_telemetry_snapshot_task';
import { runTelemetrySnapshot } from './run_telemetry_snapshot';

jest.mock('./run_telemetry_snapshot', () => ({
  runTelemetrySnapshot: jest.fn().mockResolvedValue({ state: { lastSnapshotDay: '2026-09-28' } }),
}));

const register = () => {
  const taskManager = taskManagerMock.createSetup();
  const getDependencies = jest.fn();
  const logger = loggerMock.create();
  registerTelemetrySnapshotTask({ getDependencies, logger, taskManager });
  const [[definitions]] = taskManager.registerTaskDefinitions.mock.calls;
  return { definition: definitions[TELEMETRY_SNAPSHOT_TASK_TYPE], getDependencies, logger };
};

describe('registerTelemetrySnapshotTask', () => {
  it('registers a five-minute, normal-cost, maintenance-priority task type', () => {
    const { definition } = register();

    expect(definition).toEqual(
      expect.objectContaining({
        cost: TaskCost.Normal,
        priority: TaskPriority.Maintenance,
        timeout: '5m',
        title: expect.any(String),
      })
    );
  });

  it('declares a versioned state schema whose initial state is empty', () => {
    const { definition } = register();
    const { schema, up } = definition.stateSchemaByVersion?.[1] ?? {};

    expect(schema?.validate({})).toEqual({});
    expect(schema?.validate({ lastSnapshotDay: '2026-09-28' })).toEqual({
      lastSnapshotDay: '2026-09-28',
    });
    expect(() => schema?.validate({ lastSnapshotDay: '2026-09-28T00:00:00.000Z' })).toThrow();
    expect(up?.({ lastSnapshotDay: '2026-09-28', stale: true })).toEqual({
      lastSnapshotDay: '2026-09-28',
    });
    expect(up?.({ lastSnapshotDay: 42 })).toEqual({});
  });

  it('runs the snapshot with the task state and the run abort signal', async () => {
    const { definition, getDependencies, logger } = register();
    const { signal } = new AbortController();
    const taskInstance = {
      state: { lastSnapshotDay: '2026-09-27' },
    } as unknown as ConcreteTaskInstance;

    const runner = definition.createTaskRunner({
      executionUuid: 'execution-uuid',
      setCustomTaskRunEventFields: jest.fn(),
      signal,
      taskInstance,
    });
    const result = await runner.run();

    expect(runTelemetrySnapshot).toHaveBeenCalledWith({
      getDependencies,
      logger,
      now: expect.any(Date),
      signal,
      state: { lastSnapshotDay: '2026-09-27' },
    });
    expect(result).toEqual({ state: { lastSnapshotDay: '2026-09-28' } });
  });
});
