/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { coreMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { Plugin } from './plugin';
import { PRIVATE_LOCATIONS_SYNC_TASK_ID } from './tasks/sync_private_locations_monitors_task';

vi.mock('./synthetics_service/synthetics_service', () => {
  const mocked = {
    SyntheticsService: vi.fn().mockImplementation(() => ({
      setup: vi.fn().mockResolvedValue(undefined),
      start: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./synthetics_service/synthetics_monitor/synthetics_monitor_client', () => {
  const mocked = {
    SyntheticsMonitorClient: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./server', () => {
  const mocked = {
    initSyntheticsServer: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./saved_objects/saved_objects', () => {
  const mocked = {
    registerSyntheticsSavedObjects: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./telemetry/sender', () => {
  const mocked = {
    TelemetryEventsSender: vi.fn().mockImplementation(() => ({
      setup: vi.fn(),
      start: vi.fn().mockResolvedValue(undefined),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./tasks/rebalance_private_location_shards_task', () => {
  const mocked = {
    RebalancePrivateLocationShardsTask: vi.fn().mockImplementation(() => ({
      registerTaskDefinition: vi.fn(),
      start: vi.fn().mockResolvedValue(undefined),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./tasks/sync_global_params_task', () => {
  const mocked = {
    SyncGlobalParamsPrivateLocationsTask: vi.fn().mockImplementation(() => ({
      registerTaskDefinition: vi.fn(),
    })),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./agent_builder/register_data_provider', () => {
  const mocked = {
    registerDataProviders: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const flushStart = () => new Promise((resolve) => setImmediate(resolve));

describe('Synthetics server plugin', () => {
  it('registers the private-location sync task with maintenance windows after it is scheduled', async () => {
    const context = coreMock.createPluginInitializerContext({ enabled: true });
    const plugin = new Plugin(context);

    const taskManagerSetup = taskManagerMock.createSetup();
    const taskManagerStart = taskManagerMock.createStart();
    taskManagerStart.get.mockRejectedValue({ statusCode: 404 });
    taskManagerStart.ensureScheduled.mockResolvedValue({} as any);

    plugin.setup(coreMock.createSetup(), {
      ruleRegistry: {
        ruleDataService: {
          initializeIndex: vi.fn().mockReturnValue({}),
        },
      },
      features: {
        registerKibanaFeature: vi.fn(),
      },
      taskManager: taskManagerSetup,
      telemetry: {},
      cloud: {},
      share: {},
      alerting: {},
      embeddable: {
        registerEmbeddableServerDefinition: vi.fn(),
      },
      encryptedSavedObjects: {},
      observability: {},
      usageCollection: {},
      ml: {},
    } as any);

    const registerSyncTask = vi.fn().mockReturnValue(vi.fn());
    plugin.start(coreMock.createStart(), {
      taskManager: taskManagerStart,
      maintenanceWindows: {
        registerSyncTask,
        getMaintenanceWindowClientInternal: vi.fn(),
      },
      security: {},
      fleet: {},
      encryptedSavedObjects: {},
      telemetry: {},
      alerting: {},
    } as any);

    await flushStart();

    expect(registerSyncTask).toHaveBeenCalledWith(PRIVATE_LOCATIONS_SYNC_TASK_ID);
  });
});
