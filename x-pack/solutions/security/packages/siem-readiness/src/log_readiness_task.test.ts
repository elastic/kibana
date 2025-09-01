/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { logReadinessTask } from './log_readiness_task';
import type { SiemReadinessTask } from './types';
import { SIEM_READINESS_INDEX } from './constants';

describe('logReadinessTask', () => {
  const mockEsClient = {
    index: jest.fn(),
  } as unknown as ElasticsearchClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log a task to the correct index', async () => {
    const task: SiemReadinessTask = {
      task_id: 'test-task-1',
      status: 'complete',
      meta: {
        description: 'Test task',
        duration: 1000,
      },
    };

    await logReadinessTask(mockEsClient, task);

    expect(mockEsClient.index).toHaveBeenCalledWith({
      index: SIEM_READINESS_INDEX,
      body: {
        ...task,
        '@timestamp': expect.any(String),
      },
      id: task.task_id,
    });
  });

  it('should handle incomplete status', async () => {
    const task: SiemReadinessTask = {
      task_id: 'test-task-2',
      status: 'incomplete',
      meta: {
        error: 'Something went wrong',
      },
    };

    await logReadinessTask(mockEsClient, task);

    expect(mockEsClient.index).toHaveBeenCalledWith({
      index: SIEM_READINESS_INDEX,
      body: {
        ...task,
        '@timestamp': expect.any(String),
      },
      id: task.task_id,
    });
  });

  it('should throw an error if ES client fails', async () => {
    const task: SiemReadinessTask = {
      task_id: 'test-task-3',
      status: 'complete',
      meta: {},
    };

    (mockEsClient.index as jest.Mock).mockRejectedValue(new Error('ES error'));

    await expect(logReadinessTask(mockEsClient, task)).rejects.toThrow(
      'Failed to log SIEM readiness task: Error: ES error'
    );
  });
});
