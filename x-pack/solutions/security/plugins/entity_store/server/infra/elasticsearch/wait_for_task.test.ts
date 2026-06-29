/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { waitForTaskToComplete } from './wait_for_task';

const TASK_ID = 'test-task-id:123';

function createMockEsClient(
  responses: Array<{ completed: boolean; response?: unknown; error?: unknown }>
): jest.Mocked<ElasticsearchClient> {
  const tasksGet = jest.fn();
  for (const res of responses) {
    tasksGet.mockResolvedValueOnce(res);
  }
  return { tasks: { get: tasksGet } } as unknown as jest.Mocked<ElasticsearchClient>;
}

describe('waitForTaskToComplete', () => {
  const mockLogger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the task response immediately when the task is already complete', async () => {
    const taskResponse = { total: 5, created: 5 };
    const esClient = createMockEsClient([{ completed: true, response: taskResponse }]);

    const result = await waitForTaskToComplete<typeof taskResponse>({
      esClient,
      taskId: TASK_ID,
      logger: mockLogger,
    });

    expect(result).toEqual(taskResponse);
    expect(esClient.tasks.get as jest.Mock).toHaveBeenCalledTimes(1);
    expect(esClient.tasks.get as jest.Mock).toHaveBeenCalledWith(
      { task_id: TASK_ID, wait_for_completion: false },
      expect.anything()
    );
  });

  it('throws immediately (AbortError) when the task itself reports an error', async () => {
    const esClient = createMockEsClient([
      { completed: false, error: { reason: 'shard unavailable' } },
    ]);

    await expect(
      waitForTaskToComplete({ esClient, taskId: TASK_ID, logger: mockLogger })
    ).rejects.toThrow('Task "test-task-id:123" failed: shard unavailable');

    // Must not retry — tasks.get called exactly once
    expect(esClient.tasks.get as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('polls until the task completes, logging a debug message on each wait', async () => {
    const taskResponse = { total: 3, updated: 3 };
    const esClient = createMockEsClient([
      { completed: false },
      { completed: false },
      { completed: true, response: taskResponse },
    ]);

    const result = await waitForTaskToComplete<typeof taskResponse>({
      esClient,
      taskId: TASK_ID,
      logger: mockLogger,
      minTimeout: 1,
      maxTimeout: 1,
    });

    expect(result).toEqual(taskResponse);
    expect(esClient.tasks.get as jest.Mock).toHaveBeenCalledTimes(3);
    expect(mockLogger.debug).toHaveBeenCalledTimes(2);
    expect(mockLogger.debug).toHaveBeenCalledWith(`Waiting for task "${TASK_ID}" to complete...`);
  });
});
