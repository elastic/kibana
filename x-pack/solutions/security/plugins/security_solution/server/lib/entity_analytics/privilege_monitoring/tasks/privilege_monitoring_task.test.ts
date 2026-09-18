/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// jest.mock calls are hoisted before imports. Keep them at the top and avoid
// referencing outer bindings (temporal dead zone).
jest.mock('../auth/api_key', () => ({
  getApiKeyManager: jest.fn().mockReturnValue({
    getClient: jest.fn().mockResolvedValue(undefined),
  }),
}));

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { ConcreteTaskInstance, RunContext } from '@kbn/task-manager-plugin/server';

import { registerPrivilegeMonitoringTask } from './privilege_monitoring_task';
import { TYPE, VERSION } from '../constants';
import { defaultState } from './state';

describe('registerPrivilegeMonitoringTask — execution context wrap', () => {
  const logger = loggingSystemMock.createLogger();
  const namespace = 'default';

  const taskInstance = {
    id: `${TYPE}:${namespace}:${VERSION}`,
    state: { ...defaultState, namespace, runs: 0 },
  } as unknown as ConcreteTaskInstance;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('wraps the task run in coreStart.executionContext.withContext with the expected label and id', async () => {
    const withContext = jest
      .fn()
      .mockImplementation(<T>(_ctx: unknown, fn: () => T): T => fn());
    const mockCore = {
      executionContext: { withContext },
    };
    const mockStartDeps = {
      // getPrivilegedUserMonitoringDataClient calls getStartServices again to
      // resolve these; getApiKeyManager is mocked above to return a client of
      // undefined, so no further plugin surface is exercised.
      taskManager: taskManagerMock.createStart(),
      security: {},
      encryptedSavedObjects: {},
    };
    const getStartServicesMock = jest.fn().mockResolvedValue([mockCore, mockStartDeps]);

    const mockTaskManager = taskManagerMock.createSetup();
    registerPrivilegeMonitoringTask({
      getStartServices: getStartServicesMock,
      logger,
      telemetry: {} as never,
      taskManager: mockTaskManager,
      kibanaVersion: '9.0.0',
      experimentalFeatures: {} as never,
      config: {
        entityAnalytics: {
          monitoring: { privileges: { users: { maxPrivilegedUsersAllowed: 100 } } },
        },
      } as never,
    });

    const createTaskRunner =
      mockTaskManager.registerTaskDefinitions.mock.calls[0][0][TYPE].createTaskRunner;
    // The runtime only reads taskInstance from RunContext; supply just that
    // and cast to satisfy the wider RunContext signature.
    const runner = createTaskRunner({ taskInstance } as unknown as RunContext);
    await runner.run();

    expect(withContext).toHaveBeenCalledTimes(1);
    expect(withContext).toHaveBeenCalledWith(
      {
        type: 'security_solution',
        name: 'entity_analytics:privilege_monitoring_task',
        id: taskInstance.id,
      },
      expect.any(Function)
    );
  });
});
