/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReadinessTasks } from './use_readiness_tasks';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  POST_SIEM_READINESS_TASK_API_PATH,
  GET_LATEST_SIEM_READINESS_TASKS_API_PATH,
} from './constants';
import type { SiemReadinessTask, TaskSource } from './types';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

// Mock the validation to avoid dependency on actual readiness tasks config
jest.mock('./validate_task', () => ({
  validateTask: jest.fn(),
}));

describe('useReadinessTasks', () => {
  const mockPost = jest.fn();
  const mockGet = jest.fn();
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {
          post: mockPost,
          get: mockGet,
        },
      },
    });
  });

  describe('logReadinessTask', () => {
    it('should call http.post with the correct arguments when logging a task', async () => {
      const { result } = renderHook(() => useReadinessTasks(), { wrapper });

      const task: SiemReadinessTask = {
        task_id: 'enable-endpoint-visibility',
        status: 'completed',
        meta: { agent_status: 'healthy', endpoint_count: 5 },
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
      const { result } = renderHook(() => useReadinessTasks(), { wrapper });

      const task: SiemReadinessTask = {
        task_id: 'ingest-cloud-audit-logs',
        status: 'incomplete',
        meta: { cloud_provider: ['aws'], log_count: 0 },
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

    it('should invalidate queries when mutation succeeds', async () => {
      mockPost.mockResolvedValue({});
      const { result } = renderHook(() => useReadinessTasks(), { wrapper });

      const task: SiemReadinessTask = {
        task_id: 'ingest-asset-inventory',
        status: 'completed',
        meta: {},
      };

      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        result.current.logReadinessTask(task);
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['latest-readiness-tasks'] });
    });
  });

  describe('getLatestTasks', () => {
    it('should call http.get with the correct API path', async () => {
      const mockTasks: TaskSource[] = [
        {
          task_id: 'enable-endpoint-visibility',
          status: 'completed',
          meta: { agent_status: 'healthy', endpoint_count: 5 },
          '@timestamp': '2023-09-21T10:00:00.000Z',
        },
        {
          task_id: 'ingest-cloud-audit-logs',
          status: 'incomplete',
          meta: { cloud_provider: ['aws'], log_count: 0 },
          '@timestamp': '2023-09-21T09:30:00.000Z',
        },
      ];

      mockGet.mockResolvedValue(mockTasks);

      const { result } = renderHook(() => useReadinessTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.getLatestTasks.isSuccess).toBe(true);
      });

      expect(mockGet).toHaveBeenCalledWith(GET_LATEST_SIEM_READINESS_TASKS_API_PATH);
      expect(result.current.getLatestTasks.data).toEqual(mockTasks);
    });

    it('should handle loading state correctly', async () => {
      mockGet.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useReadinessTasks(), { wrapper });

      expect(result.current.getLatestTasks.isLoading).toBe(true);
      expect(result.current.getLatestTasks.data).toBeUndefined();
    });

    it('should handle error state correctly', async () => {
      const errorMessage = 'Failed to fetch tasks';
      mockGet.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useReadinessTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.getLatestTasks.isError).toBe(true);
      });

      expect(result.current.getLatestTasks.error).toEqual(new Error(errorMessage));
      expect(result.current.getLatestTasks.data).toBeUndefined();
    });

    it('should return empty array when no tasks are available', async () => {
      mockGet.mockResolvedValue([]);

      const { result } = renderHook(() => useReadinessTasks(), { wrapper });

      await waitFor(() => {
        expect(result.current.getLatestTasks.isSuccess).toBe(true);
      });

      expect(result.current.getLatestTasks.data).toEqual([]);
    });

    it('should refetch when query is invalidated', async () => {
      const initialTasks: TaskSource[] = [
        {
          task_id: 'enable-endpoint-visibility',
          status: 'incomplete',
          meta: {},
          '@timestamp': '2023-09-21T10:00:00.000Z',
        },
      ];

      const updatedTasks: TaskSource[] = [
        {
          task_id: 'enable-endpoint-visibility',
          status: 'completed',
          meta: { agent_status: 'healthy', endpoint_count: 5 },
          '@timestamp': '2023-09-21T10:30:00.000Z',
        },
      ];

      mockGet.mockResolvedValueOnce(initialTasks).mockResolvedValueOnce(updatedTasks);

      const { result } = renderHook(() => useReadinessTasks(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.getLatestTasks.isSuccess).toBe(true);
      });

      expect(result.current.getLatestTasks.data).toEqual(initialTasks);

      // Invalidate queries (simulating what happens after a successful mutation)
      await act(async () => {
        queryClient.invalidateQueries({ queryKey: ['latest-readiness-tasks'] });
      });

      // Wait for refetch
      await waitFor(() => {
        expect(result.current.getLatestTasks.data).toEqual(updatedTasks);
      });

      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });
});
