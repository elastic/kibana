/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { Plugin } from './plugin';
import { PRIVATE_LOCATIONS_SYNC_TASK_ID } from './tasks/sync_private_locations_monitors_task';

jest.mock('./synthetics_service/synthetics_service', () => ({
  SyntheticsService: jest.fn().mockImplementation(() => ({
    setup: jest.fn().mockResolvedValue(undefined),
    start: jest.fn(),
  })),
}));

jest.mock('./synthetics_service/synthetics_monitor/synthetics_monitor_client', () => ({
  SyntheticsMonitorClient: jest.fn(),
}));

jest.mock('./server', () => ({
  initSyntheticsServer: jest.fn(),
}));

jest.mock('./saved_objects/saved_objects', () => ({
  registerSyntheticsSavedObjects: jest.fn(),
}));

jest.mock('./telemetry/sender', () => ({
  TelemetryEventsSender: jest.fn().mockImplementation(() => ({
    setup: jest.fn(),
    start: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('./tasks/sync_global_params_task', () => ({
  SyncGlobalParamsPrivateLocationsTask: jest.fn().mockImplementation(() => ({
    registerTaskDefinition: jest.fn(),
  })),
}));

const flushStart = () => new Promise((resolve) => setImmediate(resolve));

describe('Synthetics server plugin', () => {
  it('registers the private-location sync task with alerting after it is scheduled', async () => {
    const context = coreMock.createPluginInitializerContext({ enabled: true });
    const plugin = new Plugin(context);

    const taskManagerSetup = taskManagerMock.createSetup();
    const taskManagerStart = taskManagerMock.createStart();
    taskManagerStart.get.mockRejectedValue({ statusCode: 404 });
    taskManagerStart.ensureScheduled.mockResolvedValue({} as any);

    plugin.setup(coreMock.createSetup(), {
      ruleRegistry: {
        ruleDataService: {
          initializeIndex: jest.fn().mockReturnValue({}),
        },
      },
      features: {
        registerKibanaFeature: jest.fn(),
      },
      taskManager: taskManagerSetup,
      telemetry: {},
      cloud: {},
      share: {},
      alerting: {},
      encryptedSavedObjects: {},
      observability: {},
      usageCollection: {},
      ml: {},
    } as any);

    const registerSyncTask = jest.fn().mockReturnValue(jest.fn());
    plugin.start(coreMock.createStart(), {
      taskManager: taskManagerStart,
      alerting: {
        registerSyncTask,
      },
      security: {},
      fleet: {},
      encryptedSavedObjects: {},
      telemetry: {},
    } as any);

    await flushStart();

    expect(registerSyncTask).toHaveBeenCalledWith(PRIVATE_LOCATIONS_SYNC_TASK_ID);
  });
});
