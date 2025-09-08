/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogReadinessTask } from './use_log_readiness_task';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { POST_SIEM_READINESS_TASK_API_PATH } from './constants';
import type { SiemReadinessTask } from './types';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

describe('useLogReadinessTask', () => {
  const mockPost = jest.fn();
  const queryClient = new QueryClient();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {
          post: mockPost,
        },
      },
    });
  });

  it('should call http.post with the correct arguments when logging a task', async () => {
    const { result } = renderHook(() => useLogReadinessTask(), { wrapper });

    const task: SiemReadinessTask = {
      task_id: 'test-task-1',
      status: 'complete',
      meta: { description: 'Test task', duration: 1000 },
    };

    await act(async () => {
      result.current.logReadinessTask(task);
    });

    expect(mockPost).toHaveBeenCalledWith(POST_SIEM_READINESS_TASK_API_PATH, {
      body: JSON.stringify(task),
    });
  });

  it('should handle an error response from http.post', async () => {
    mockPost.mockRejectedValue(new Error('HTTP error'));
    const { result } = renderHook(() => useLogReadinessTask({ onError: jest.fn() }), { wrapper });

    const task: SiemReadinessTask = {
      task_id: 'test-task-2',
      status: 'incomplete',
      meta: { error: 'Something went wrong' },
    };

    await act(async () => {
      try {
        result.current.logReadinessTask(task);
      } catch {
        // expected to throw
      }
    });

    expect(mockPost).toHaveBeenCalledWith(POST_SIEM_READINESS_TASK_API_PATH, {
      body: JSON.stringify(task),
    });
  });

  it('should call onSuccess callback when mutation succeeds', async () => {
    const onSuccess = jest.fn();
    mockPost.mockResolvedValue({});
    const { result } = renderHook(() => useLogReadinessTask({ onSuccess }), { wrapper });

    const task: SiemReadinessTask = {
      task_id: 'test-task-3',
      status: 'complete',
      meta: {},
    };

    await act(async () => {
      result.current.logReadinessTask(task);
    });

    expect(onSuccess).toHaveBeenCalled();
  });
});
