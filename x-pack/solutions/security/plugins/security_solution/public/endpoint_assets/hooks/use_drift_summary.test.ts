/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useDriftSummary } from './use_drift_summary';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockHttpGet = jest.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useDriftSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        http: {
          get: mockHttpGet,
        },
      },
    });
  });

  it('returns loading state initially', () => {
    mockHttpGet.mockReturnValue(new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useDriftSummary(), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('returns data on successful fetch', async () => {
    const mockData = {
      total_events: 10,
      events_by_category: {
        privileges: 2,
        persistence: 3,
        network: 2,
        software: 2,
        posture: 1,
      },
      events_by_severity: {
        critical: 1,
        high: 3,
        medium: 4,
        low: 2,
      },
      assets_with_changes: 3,
      top_changed_assets: [],
      recent_changes: [],
      time_range: '24h',
    };

    mockHttpGet.mockResolvedValue(mockData);

    const { result } = renderHook(() => useDriftSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('returns error on failed fetch', async () => {
    const mockError = new Error('Network error');
    mockHttpGet.mockRejectedValue(mockError);

    const { result } = renderHook(() => useDriftSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toEqual(mockError);
  });

  it('uses custom time range option', async () => {
    const mockData = { total_events: 0 };
    mockHttpGet.mockResolvedValue(mockData);

    renderHook(() => useDriftSummary({ timeRange: '7d' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockHttpGet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: { time_range: '7d' },
        })
      );
    });
  });

  it('provides refresh function', async () => {
    mockHttpGet.mockResolvedValue({ total_events: 5 });

    const { result } = renderHook(() => useDriftSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refresh).toBe('function');
  });
});
