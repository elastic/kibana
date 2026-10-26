/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { SyntheticsServerSetup } from '../types';
import * as monitorUpgradeSender from '../routes/telemetry/monitor_upgrade_sender';
import type { MonitorSyncState } from './incremental_sync';
import {
  SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID,
  SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE,
  recordRun,
  registerMonitorSyncTask,
  scheduleMonitorSyncTask,
} from './monitor_sync_task';

jest.mock('../routes/telemetry/monitor_upgrade_sender');

const sendErrorTelemetryEvents = monitorUpgradeSender.sendErrorTelemetryEvents as jest.Mock;

const NOW = '2026-10-06T12:00:00.000Z';

describe('monitor sync task', () => {
  const logger = loggerMock.create();
  const telemetry = {};
  const server = { logger, telemetry, stackVersion: '9.5.0' } as unknown as SyntheticsServerSetup;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: new Date(NOW) });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('identifiers', () => {
    it('keeps the task type and id that existing deployments have scheduled', () => {
      expect(SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE).toBe(
        'UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects'
      );
      expect(SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID).toBe('UPTIME:SyntheticsService:sync-task');
    });
  });

  describe('recordRun', () => {
    it('stamps the time of the run when there was no previous one', () => {
      const state: MonitorSyncState = {};

      recordRun(state, { server });

      expect(state.lastRunAt).toBe(NOW);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(sendErrorTelemetryEvents).not.toHaveBeenCalled();
    });

    it('only logs how long ago the previous run was when it was on schedule', () => {
      const state: MonitorSyncState = { lastRunAt: '2026-10-06T11:55:00.000Z' };

      recordRun(state, { server });

      expect(logger.debug).toHaveBeenCalledWith(
        'Synthetics monitor sync task last ran 5 minutes ago.'
      );
      expect(logger.warn).not.toHaveBeenCalled();
      expect(state.lastRunAt).toBe(NOW);
    });

    it('warns and reports when the previous run is more than the interval plus five minutes ago', () => {
      recordRun({ lastRunAt: '2026-10-06T11:49:00.000Z' }, { server });

      const message =
        'Synthetics monitor sync task has missed its schedule, it last ran 11 minutes ago.';
      expect(logger.warn).toHaveBeenCalledWith(message);
      expect(sendErrorTelemetryEvents).toHaveBeenCalledWith(
        logger,
        telemetry,
        expect.objectContaining({
          message,
          type: 'syncTaskMissedSchedule',
          stackVersion: '9.5.0',
        })
      );
    });

    it('allows for a longer configured interval before warning', () => {
      recordRun({ lastRunAt: '2026-10-06T11:49:00.000Z' }, { server, syncInterval: '10m' });

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('registerMonitorSyncTask', () => {
    const register = (options: { syncInterval?: string; runSync?: jest.Mock } = {}) => {
      const taskManager = taskManagerMock.createSetup();
      const runSync = options.runSync ?? jest.fn().mockResolvedValue(undefined);

      registerMonitorSyncTask({ taskManager, server, syncInterval: options.syncInterval, runSync });

      const [definitions] = taskManager.registerTaskDefinitions.mock.calls[0];
      const definition = definitions[SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE];
      const createRunner = (state: Record<string, unknown> = {}) =>
        definition.createTaskRunner({
          taskInstance: { state } as unknown as ConcreteTaskInstance,
        } as never);

      return { definition, createRunner, runSync };
    };

    it('registers the task under its type', () => {
      const { definition } = register();

      expect(definition).toEqual(
        expect.objectContaining({
          title: 'Synthetics Service - Sync Saved Monitors',
          timeout: '2m',
          maxAttempts: 3,
        })
      );
    });

    it('runs the sync with the task state and schedules the next run at the default interval', async () => {
      const state: Record<string, unknown> = { lastSyncedAt: 'earlier' };
      const { createRunner, runSync } = register();

      const result = await createRunner(state).run();

      expect(runSync).toHaveBeenCalledWith(state);
      expect(state.lastRunAt).toBe(NOW);
      expect(result).toEqual({ state, schedule: { interval: '5m' } });
    });

    it('schedules the next run at the configured interval', async () => {
      const { createRunner } = register({ syncInterval: '1m' });

      const result = await createRunner().run();

      expect(result?.schedule).toEqual({ interval: '1m' });
    });

    it('reports a failed run and still schedules the next one', async () => {
      const error = Object.assign(new Error('sync failed'), { code: 'ECONNRESET' });
      const { createRunner } = register({ runSync: jest.fn().mockRejectedValue(error) });

      const result = await createRunner().run();

      expect(logger.error).toHaveBeenCalledWith(error);
      expect(sendErrorTelemetryEvents).toHaveBeenCalledWith(
        logger,
        telemetry,
        expect.objectContaining({
          reason: 'Failed to run scheduled sync task',
          message: 'sync failed',
          type: 'runTaskError',
          code: 'ECONNRESET',
        })
      );
      expect(result?.schedule).toEqual({ interval: '5m' });
    });

    it('warns when the run is cancelled for taking too long', async () => {
      const { createRunner } = register();

      await createRunner().cancel?.();

      expect(logger.warn).toHaveBeenCalledWith(
        `Task ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID} timed out`
      );
    });
  });

  describe('scheduleMonitorSyncTask', () => {
    it('ensures a single recurring task is scheduled at the default interval', async () => {
      const taskManager = taskManagerMock.createStart();
      const taskInstance = { schedule: { interval: '5m' } };
      taskManager.ensureScheduled.mockResolvedValue(taskInstance as never);

      const scheduled = await scheduleMonitorSyncTask({ taskManager, server });

      expect(scheduled).toBe(taskInstance);
      expect(taskManager.ensureScheduled).toHaveBeenCalledWith({
        id: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID,
        taskType: SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_TYPE,
        schedule: { interval: '5m' },
        params: {},
        state: {},
        scope: ['uptime'],
      });
      expect(logger.info).toHaveBeenCalledWith(
        `Task ${SYNTHETICS_SERVICE_SYNC_MONITORS_TASK_ID} scheduled with interval 5m.`
      );
    });

    it('schedules at the configured interval', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.ensureScheduled.mockResolvedValue({ schedule: { interval: '1m' } } as never);

      await scheduleMonitorSyncTask({ taskManager, server, syncInterval: '1m' });

      expect(taskManager.ensureScheduled).toHaveBeenCalledWith(
        expect.objectContaining({ schedule: { interval: '1m' } })
      );
    });

    it('reports a failure to schedule and resolves with null', async () => {
      const taskManager = taskManagerMock.createStart();
      taskManager.ensureScheduled.mockRejectedValue(new Error('no task manager'));

      const scheduled = await scheduleMonitorSyncTask({ taskManager, server });

      expect(scheduled).toBeNull();
      expect(sendErrorTelemetryEvents).toHaveBeenCalledWith(
        logger,
        telemetry,
        expect.objectContaining({
          reason: 'Failed to schedule sync task',
          message: 'no task manager',
          type: 'scheduleTaskError',
        })
      );
      expect(logger.error).toHaveBeenCalledTimes(2);
    });
  });
});
