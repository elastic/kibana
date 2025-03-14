/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  removeEntityStoreDataViewRefreshTask,
  runEntityStoreDataViewRefreshTask,
} from './data_view_refresh_task';
import { TYPE, VERSION } from './constants';
import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import { mockGlobalState } from '../../../../../../public/common/mock';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';

const mockLog = jest.fn();
jest.mock('../utils', () => ({
  entityStoreTaskLogFactory: () => mockLog,
  entityStoreTaskDebugLogFactory: () => mockLog,
}));

jest.mock('../../../../telemetry/event_based/events', () => ({
  ENTITY_STORE_DATA_VIEW_REFRESH_EXECUTION_EVENT: {
    eventType: 'entity_store_data_view_refresh_execution',
  },
}));

const TASK_ID = `${TYPE}:default:${VERSION}`;

describe('data_view_refresh_task', () => {
  const logger = loggerMock.create();
  const telemetry = coreMock.createSetup().analytics;

  const taskManager = taskManagerMock.createStart();
  const experimentalFeatures = mockGlobalState.app.enableExperimental;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('removeEntityStoreDataViewRefreshTask', () => {
    it('should remove the task', async () => {
      await removeEntityStoreDataViewRefreshTask({
        logger,
        namespace: 'default',
        taskManager,
      });

      expect(taskManager.remove).toHaveBeenCalled();
    });
  });

  describe('runEntityStoreDataViewRefreshTask', () => {
    const taskInstance = {
      id: TASK_ID,
      state: {
        namespace: 'default',
        runs: 0,
        lastExecutionTimestamp: '',
      },
    } as unknown as ConcreteTaskInstance;

    it('should run the task', async () => {
      const refreshDataViews = jest.fn();
      const isCancelled = jest.fn().mockReturnValue(false);

      await runEntityStoreDataViewRefreshTask({
        refreshDataViews,
        isCancelled,
        logger,
        taskInstance,
        telemetry,
        experimentalFeatures,
      });

      expect(refreshDataViews).toHaveBeenCalledWith('default');
    });

    it('should log an error if task execution fails', async () => {
      const refreshDataViews = jest.fn().mockRejectedValue(new Error('Execution failed'));
      const isCancelled = jest.fn().mockReturnValue(false);

      await runEntityStoreDataViewRefreshTask({
        refreshDataViews,
        isCancelled,
        logger,
        taskInstance,
        telemetry,
        experimentalFeatures,
      });

      expect(mockLog).toHaveBeenCalledWith('Error executing data view refresh: Execution failed');
    });
  });
});
