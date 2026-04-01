/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { HttpSetup } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { useWorkflowTracking, type WorkflowTrackingResponse } from '.';

const mockFetch = jest.fn();
const mockHttp = { fetch: mockFetch } as unknown as HttpSetup;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const mockTrackingResponse: WorkflowTrackingResponse = {
  alert_retrieval: [
    {
      workflow_id: 'workflow-legacy',
      workflow_run_id: 'legacy-run-id',
    },
  ],
  generation: {
    workflow_id: 'workflow-generation',
    workflow_run_id: 'generation-run-id',
  },
  validation: {
    workflow_id: 'workflow-validate',
    workflow_run_id: 'validation-run-id',
  },
};

describe('useWorkflowTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch when executionId is null', () => {
    renderHook(
      () =>
        useWorkflowTracking({
          executionId: null,
          http: mockHttp,
        }),
      { wrapper }
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches tracking data when executionId is provided', async () => {
    mockFetch.mockResolvedValue(mockTrackingResponse);

    const { result } = renderHook(
      () =>
        useWorkflowTracking({
          executionId: 'test-execution-id',
          http: mockHttp,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockTrackingResponse);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/attack_discovery/executions/test-execution-id/tracking',
      expect.objectContaining({
        method: 'GET',
        version: '1',
      })
    );
  });

  it('returns error state when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () =>
        useWorkflowTracking({
          executionId: 'test-execution-id',
          http: mockHttp,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('encodes the executionId in the URL', async () => {
    mockFetch.mockResolvedValue(mockTrackingResponse);

    renderHook(
      () =>
        useWorkflowTracking({
          executionId: 'id with spaces/and:colons',
          http: mockHttp,
        }),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/internal/attack_discovery/executions/id%20with%20spaces%2Fand%3Acolons/tracking',
      expect.anything()
    );
  });
});
