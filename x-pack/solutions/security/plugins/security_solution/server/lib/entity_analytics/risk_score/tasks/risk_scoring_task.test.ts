/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { removeRiskScoringTask } from './risk_scoring_task';

describe('Risk Scoring Task', () => {
  let mockTaskManagerStart: ReturnType<typeof taskManagerMock.createStart>;
  let mockLogger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    mockTaskManagerStart = taskManagerMock.createStart();
    mockLogger = loggerMock.create();
  });

  describe('removeRiskScoringTask()', () => {
    it('removes the task', async () => {
      await removeRiskScoringTask({
        namespace: 'default',
        logger: mockLogger,
        taskManager: mockTaskManagerStart,
      });

      expect(mockTaskManagerStart.remove).toHaveBeenCalledWith(
        'risk_engine:risk_scoring:default:0.0.1'
      );
    });

    it('removes the task for a non-default namespace', async () => {
      await removeRiskScoringTask({
        namespace: 'other',
        logger: mockLogger,
        taskManager: mockTaskManagerStart,
      });

      expect(mockTaskManagerStart.remove).toHaveBeenCalledWith(
        'risk_engine:risk_scoring:other:0.0.1'
      );
    });

    it('does nothing if task was not found', async () => {
      mockTaskManagerStart.remove.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError('type', 'id')
      );
      await removeRiskScoringTask({
        namespace: 'default',
        logger: mockLogger,
        taskManager: mockTaskManagerStart,
      });

      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('rethrows errors other than "not found"', async () => {
      mockTaskManagerStart.remove.mockRejectedValueOnce(new Error('whoops'));

      await expect(
        removeRiskScoringTask({
          namespace: 'default',
          logger: mockLogger,
          taskManager: mockTaskManagerStart,
        })
      ).rejects.toThrowError('whoops');

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to remove risk scoring task: whoops');
    });
  });
});
